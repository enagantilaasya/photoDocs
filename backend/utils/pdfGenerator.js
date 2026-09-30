const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const ImageFile = require('../models/ImageFile');

/**
 * Check if a buffer is valid JPEG or PNG (which PDFKit natively supports)
 */
const isSupportedPdfImage = (buf) => {
  if (!buf || !Buffer.isBuffer(buf) || buf.length < 8) return false;
  // JPEG: FF D8 FF
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  return isJpeg || isPng;
};

/**
 * Download an external image with strict timeout (2000ms), redirect following, and size limits
 */
const fetchRemoteBufferWithTimeout = (initialUrl, timeoutMs = 2000, maxRedirects = 3) => {
  return new Promise((resolve) => {
    let resolved = false;
    let redirectsCount = 0;
    let currentReq = null;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        if (currentReq) {
          try {
            currentReq.destroy();
          } catch (e) {}
        }
        resolve(null);
      }
    }, timeoutMs);

    const safeResolve = (val) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        if (currentReq) {
          try {
            currentReq.destroy();
          } catch (e) {}
        }
        resolve(val);
      }
    };

    const requestHop = (targetUrl) => {
      try {
        const client = targetUrl.startsWith('https:') ? https : http;
        currentReq = client.get(
          targetUrl,
          {
            timeout: timeoutMs,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              Accept: 'image/jpeg,image/png,image/*;q=0.8'
            }
          },
          (res) => {
            // Handle redirects (301, 302, 303, 307, 308)
            if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
              redirectsCount++;
              if (redirectsCount > maxRedirects) {
                return safeResolve(null);
              }
              const redirectUrl = new URL(res.headers.location, targetUrl).href;
              return requestHop(redirectUrl);
            }

            if (res.statusCode !== 200) {
              return safeResolve(null);
            }

            const chunks = [];
            let totalBytes = 0;
            const MAX_IMG_BYTES = 8 * 1024 * 1024; // 8MB max per image to save RAM/time

            res.on('data', (chunk) => {
              totalBytes += chunk.length;
              if (totalBytes > MAX_IMG_BYTES) {
                if (currentReq) {
                  try {
                    currentReq.destroy();
                  } catch (e) {}
                }
                return safeResolve(null);
              }
              chunks.push(chunk);
            });

            res.on('end', () => safeResolve(Buffer.concat(chunks)));
            res.on('error', () => safeResolve(null));
          }
        );

        currentReq.on('error', () => safeResolve(null));
        currentReq.on('timeout', () => {
          if (currentReq) {
            try {
              currentReq.destroy();
            } catch (e) {}
          }
          safeResolve(null);
        });
      } catch (e) {
        safeResolve(null);
      }
    };

    requestHop(initialUrl);
  });
};

/**
 * Helper to get image buffer from DB, local disk, or URL
 * Never modifies or tampers with any database data.
 */
const fetchImageBuffer = async (rawUrl, perImageTimeout = 2000) => {
  try {
    if (!rawUrl || typeof rawUrl !== 'string') return null;
    let url = rawUrl.trim();

    // 1. Fast DB image lookup (/api/posts/images/:id) - READ ONLY
    const dbMatch = url.match(/\/api\/posts\/images\/([a-fA-F0-9]{24})/);
    if (dbMatch && dbMatch[1]) {
      const imgDoc = await ImageFile.findById(dbMatch[1])
        .select('data')
        .lean()
        .maxTimeMS(2000)
        .catch(() => null);

      if (imgDoc && imgDoc.data) {
        return Buffer.isBuffer(imgDoc.data)
          ? imgDoc.data
          : imgDoc.data.buffer
          ? Buffer.from(imgDoc.data.buffer)
          : Buffer.from(imgDoc.data);
      }
    }

    // 2. Fast local /uploads/ check - READ ONLY
    if (url.includes('/uploads/')) {
      const fileName = url.split('/uploads/').pop();
      const localFilePath = path.join(__dirname, '..', 'uploads', fileName);
      if (fs.existsSync(localFilePath)) {
        return await fs.promises.readFile(localFilePath).catch(() => null);
      }
      const tempPath = path.join(__dirname, '..', 'uploads', 'temp', fileName);
      if (fs.existsSync(tempPath)) {
        return await fs.promises.readFile(tempPath).catch(() => null);
      }
      const imgByFile = await ImageFile.findOne({ filename: fileName })
        .select('data')
        .lean()
        .maxTimeMS(2000)
        .catch(() => null);

      if (imgByFile && imgByFile.data) {
        return Buffer.isBuffer(imgByFile.data)
          ? imgByFile.data
          : imgByFile.data.buffer
          ? Buffer.from(imgByFile.data.buffer)
          : Buffer.from(imgByFile.data);
      }
    }

    // 3. Remote HTTP/HTTPS fetch with timeout
    if (url.startsWith('http://') || url.startsWith('https://')) {
      let fetchUrl = url;
      if (url.includes('cloudinary.com') && !url.endsWith('.jpg') && !url.endsWith('.png')) {
        fetchUrl = url.replace(/\.(webp|avif|heic)$/i, '.jpg');
        if (!fetchUrl.includes('.jpg') && !fetchUrl.includes('.png')) {
          fetchUrl = `${fetchUrl}.jpg`;
        }
      }

      return await fetchRemoteBufferWithTimeout(fetchUrl, perImageTimeout);
    }

    return null;
  } catch (err) {
    return null;
  }
};

/**
 * High-speed concurrent pre-fetch of all unique photos across all posts
 * with an overall time budget to guarantee the PDF never times out.
 */
const batchPreFetchImages = async (posts = [], totalBudgetMs = 12000, concurrency = 6) => {
  const imageMap = new Map();
  const startTime = Date.now();

  // Extract all unique photo URLs
  const uniqueUrls = [
    ...new Set(
      posts
        .flatMap((p) => (p.photos || []).map((ph) => ph.url))
        .filter((u) => u && typeof u === 'string')
    )
  ];

  if (uniqueUrls.length === 0) return imageMap;

  // Process URLs in concurrent batches
  let index = 0;
  const workers = Array.from({ length: Math.min(concurrency, uniqueUrls.length) }, async () => {
    while (index < uniqueUrls.length) {
      // Check if overall time budget has expired
      if (Date.now() - startTime > totalBudgetMs) {
        break;
      }
      const currentIndex = index++;
      const url = uniqueUrls[currentIndex];

      if (!imageMap.has(url)) {
        const remainingTime = Math.max(1000, totalBudgetMs - (Date.now() - startTime));
        const itemTimeout = Math.min(2500, remainingTime);
        const buf = await fetchImageBuffer(url, itemTimeout);
        if (buf && isSupportedPdfImage(buf)) {
          imageMap.set(url, buf);
        } else {
          imageMap.set(url, null);
        }
      }
    }
  });

  await Promise.all(workers);
  return imageMap;
};

/**
 * Format ISO date string nicely
 */
const formatDateTime = (dateVal) => {
  const d = new Date(dateVal || Date.now());
  const dateStr = d.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const timeStr = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  return { dateStr, timeStr };
};

/**
 * Synchronous in-memory assembly of posts onto PDFDocument
 * Executes in milliseconds since all required images are pre-loaded in imageMap.
 */
const writePostsToDoc = (doc, posts = [], user = {}, titleText = 'PHOTO & MEDIA DOCUMENTATION ARCHIVE', imageMap = new Map()) => {
  const pageWidth = doc.page.width - 90; // ~505 pt

  // Header Banner
  doc.rect(45, 45, pageWidth, 90).fill('#1E293B'); // Slate 800

  doc
    .fillColor('#FFFFFF')
    .fontSize(19)
    .font('Helvetica-Bold')
    .text(titleText, 60, 62, {
      width: pageWidth - 30,
      align: 'left'
    });

  doc
    .fillColor('#94A3B8')
    .fontSize(10)
    .font('Helvetica')
    .text('Official Comprehensive Record of All Documented Activities', 60, 90);

  const generatedNow = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  doc
    .fillColor('#CBD5E1')
    .fontSize(9)
    .text(`Archive Export: ${generatedNow}  •  Total Records: ${posts.length}`, 60, 108);

  doc.moveDown(4.5);

  // Contributor Profile Card
  const profileTop = 150;
  doc.rect(45, profileTop, pageWidth, 55).fillAndStroke('#F8FAFC', '#E2E8F0');

  doc
    .fillColor('#0F172A')
    .fontSize(11)
    .font('Helvetica-Bold')
    .text(`Contributor: ${user.fullName || 'Author'}`, 60, profileTop + 12);

  doc
    .fillColor('#64748B')
    .fontSize(9)
    .font('Helvetica')
    .text(
      `Email: ${user.email || 'Registered User'}  •  Role: ${user.role || 'USER'}`,
      60,
      profileTop + 30
    );

  let currentY = profileTop + 75;

  // If no posts found
  if (!posts || posts.length === 0) {
    doc
      .fillColor('#64748B')
      .fontSize(12)
      .font('Helvetica')
      .text('No documentation records have been published yet.', 45, currentY + 30, {
        align: 'center',
        width: pageWidth
      });
    return;
  }

  // Render each post
  for (let pIndex = 0; pIndex < posts.length; pIndex++) {
    const post = posts[pIndex];
    const { dateStr, timeStr } = formatDateTime(post.eventDate || post.createdAt);
    const postNumber = pIndex + 1;

    // Check if remaining space is too low, add page
    if (currentY > doc.page.height - 180) {
      doc.addPage();
      currentY = 45;
    }

    // Post Separator
    doc
      .strokeColor('#CBD5E1')
      .lineWidth(1)
      .moveTo(45, currentY)
      .lineTo(45 + pageWidth, currentY)
      .stroke();

    currentY += 14;

    // Post Badge
    doc
      .fillColor('#2563EB')
      .fontSize(9)
      .font('Helvetica-Bold')
      .text(`RECORD #${postNumber} OF ${posts.length}`, 45, currentY);

    currentY += 15;

    // Title
    doc
      .fillColor('#0F172A')
      .fontSize(16)
      .font('Helvetica-Bold')
      .text(post.title || 'Untitled Documentation', 45, currentY, {
        width: pageWidth,
        lineGap: 2
      });

    currentY = doc.y + 6;

    // Timestamps & Contributor Metadata
    const authorName = post.uploadedBy?.fullName || user.fullName || 'Contributor';
    doc
      .fillColor('#475569')
      .fontSize(9)
      .font('Helvetica')
      .text(`Activity Date: ${dateStr}   |   Time: ${timeStr}   |   By: ${authorName}`, 45, currentY);

    currentY = doc.y + 10;

    // Description Box
    const descText = post.description || 'No detailed description provided.';
    doc
      .fillColor('#334155')
      .fontSize(10)
      .font('Helvetica')
      .text(descText, 45, currentY, {
        width: pageWidth,
        lineGap: 4,
        align: 'justify'
      });

    currentY = doc.y + 14;

    // Embed Photos (if any)
    const photos = post.photos || [];
    if (photos.length > 0) {
      if (currentY > doc.page.height - 160) {
        doc.addPage();
        currentY = 45;
      }

      doc
        .fillColor('#1E293B')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(`Documented Photographs (${photos.length}):`, 45, currentY);

      currentY = doc.y + 8;

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const imgBuffer = imageMap.get(photo.url);

        if (imgBuffer && isSupportedPdfImage(imgBuffer)) {
          try {
            if (currentY + 210 > doc.page.height - 45) {
              doc.addPage();
              currentY = 45;
            }

            const maxImgW = Math.min(pageWidth, 380);
            const maxImgH = 210;

            doc.image(imgBuffer, 45, currentY, {
              fit: [maxImgW, maxImgH],
              align: 'center'
            });

            currentY += maxImgH + 6;

            doc
              .fillColor('#64748B')
              .fontSize(8)
              .font('Helvetica-Oblique')
              .text(
                `Photo ${i + 1} of ${photos.length}: ${photo.originalName || 'Photograph'}`,
                45,
                currentY,
                { width: pageWidth, align: 'center' }
              );

            currentY = doc.y + 10;
          } catch (embedErr) {
            doc
              .fillColor('#2563EB')
              .fontSize(9)
              .font('Helvetica')
              .text(`• Photo ${i + 1}: ${photo.originalName || 'Image'} (${photo.url})`, 55, currentY);
            currentY = doc.y + 4;
          }
        } else {
          doc
            .fillColor('#2563EB')
            .fontSize(9)
            .font('Helvetica')
            .text(`• Photo ${i + 1}: ${photo.originalName || 'Image'} (${photo.url})`, 55, currentY);
          currentY = doc.y + 4;
        }
      }
    }

    // Embed Videos (if any)
    const videos = post.videos || [];
    if (videos.length > 0) {
      if (currentY > doc.page.height - 130) {
        doc.addPage();
        currentY = 45;
      }

      doc
        .fillColor('#4338CA')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(`Documented Video Recordings (${videos.length}):`, 45, currentY);

      currentY = doc.y + 6;

      for (let vi = 0; vi < videos.length; vi++) {
        const vid = videos[vi];
        const vidType = vid.videoType ? vid.videoType.toUpperCase() : 'VIDEO';
        const vidTitle = vid.originalName || `Video Recording #${vi + 1}`;
        const vidUrl = vid.url || '';

        const boxH = 42;
        if (currentY + boxH > doc.page.height - 45) {
          doc.addPage();
          currentY = 45;
        }

        doc.rect(45, currentY, pageWidth, boxH).fillAndStroke('#EEF2FF', '#C7D2FE');

        doc
          .fillColor('#3730A3')
          .fontSize(9)
          .font('Helvetica-Bold')
          .text(`[${vidType}] ${vidTitle}`, 55, currentY + 8);

        doc
          .fillColor('#2563EB')
          .fontSize(8)
          .font('Helvetica')
          .text(vidUrl, 55, currentY + 23, {
            link: vidUrl,
            underline: true,
            width: pageWidth - 20
          });

        currentY += boxH + 8;
      }
    }

    if (photos.length === 0 && videos.length === 0) {
      doc
        .fillColor('#94A3B8')
        .fontSize(8)
        .font('Helvetica-Oblique')
        .text('(This is an official text-only documentation entry without attached media)', 45, currentY);
      currentY = doc.y + 8;
    }

    currentY += 15;
  }
};

/**
 * Generate a complete, polished PDF archive containing all posts for a user.
 * Guaranteed to finish within ~10-12 seconds, never exceeding server timeouts.
 */
const generateUserPostsPdf = async (posts = [], user = {}, clientOrigin = 'https://photodocs.onrender.com') => {
  return new Promise(async (resolve, reject) => {
    let finished = false;

    // Hard fail-safe: Force complete PDF output at 13 seconds if anything stalls
    const hardTimeoutTimer = setTimeout(() => {
      if (!finished) {
        finished = true;
        try {
          const fallbackDoc = new PDFDocument({ size: 'A4', margin: 45 });
          const chunks = [];
          fallbackDoc.on('data', (c) => chunks.push(c));
          fallbackDoc.on('end', () => resolve(Buffer.concat(chunks)));
          writePostsToDoc(fallbackDoc, posts, user, 'PHOTO & MEDIA DOCUMENTATION ARCHIVE', new Map());
          fallbackDoc.end();
        } catch (e) {
          reject(e);
        }
      }
    }, 13000);

    try {
      // 1. Concurrent batch pre-fetch of images with 9.5s global budget & 2s per-image timeout
      const imageMap = await batchPreFetchImages(posts, 9500, 6);

      if (finished) return;

      const doc = new PDFDocument({
        size: 'A4',
        margin: 45,
        info: {
          Title: `Documentation Archive - ${user.fullName || 'User'}`,
          Author: 'Public Photo Documentation Gallery',
          Subject: 'Complete User Posts Archive'
        }
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        if (!finished) {
          finished = true;
          clearTimeout(hardTimeoutTimer);
          resolve(Buffer.concat(chunks));
        }
      });
      doc.on('error', (err) => {
        if (!finished) {
          finished = true;
          clearTimeout(hardTimeoutTimer);
          reject(err);
        }
      });

      // 2. Synchronous rendering of pages using pre-loaded images
      writePostsToDoc(doc, posts, user, 'PHOTO & MEDIA DOCUMENTATION ARCHIVE', imageMap);
      doc.end();
    } catch (err) {
      if (!finished) {
        finished = true;
        clearTimeout(hardTimeoutTimer);
        reject(err);
      }
    }
  });
};

/**
 * Generate a clean PDF report for a single post.
 * Guaranteed to finish within ~3-4 seconds.
 */
const generateSinglePostPdf = async (post, user = {}, clientOrigin = 'https://photodocs.onrender.com') => {
  return new Promise(async (resolve, reject) => {
    let finished = false;

    // Hard fail-safe: Force complete PDF output at 6 seconds if anything stalls
    const hardTimeoutTimer = setTimeout(() => {
      if (!finished) {
        finished = true;
        try {
          const fallbackDoc = new PDFDocument({ size: 'A4', margin: 45 });
          const chunks = [];
          fallbackDoc.on('data', (c) => chunks.push(c));
          fallbackDoc.on('end', () => resolve(Buffer.concat(chunks)));
          const author = post.uploadedBy || user;
          writePostsToDoc(fallbackDoc, [post], author, 'OFFICIAL DOCUMENTATION REPORT', new Map());
          fallbackDoc.end();
        } catch (e) {
          reject(e);
        }
      }
    }, 6000);

    try {
      const imageMap = await batchPreFetchImages([post], 4500, 4);

      if (finished) return;

      const doc = new PDFDocument({
        size: 'A4',
        margin: 45,
        info: {
          Title: `Documentation Report - ${post.title || 'Post'}`,
          Author: 'Public Photo Documentation Gallery',
          Subject: 'Individual Documentation Record'
        }
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        if (!finished) {
          finished = true;
          clearTimeout(hardTimeoutTimer);
          resolve(Buffer.concat(chunks));
        }
      });
      doc.on('error', (err) => {
        if (!finished) {
          finished = true;
          clearTimeout(hardTimeoutTimer);
          reject(err);
        }
      });

      const author = post.uploadedBy || user;
      writePostsToDoc(doc, [post], author, 'OFFICIAL DOCUMENTATION REPORT', imageMap);
      doc.end();
    } catch (err) {
      if (!finished) {
        finished = true;
        clearTimeout(hardTimeoutTimer);
        reject(err);
      }
    }
  });
};

module.exports = {
  generateUserPostsPdf,
  generateSinglePostPdf
};


