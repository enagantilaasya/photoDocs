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
 * Helper to download an external URL following HTTP redirects (up to 5 hops)
 */
const fetchRemoteBufferWithRedirects = (initialUrl, maxRedirects = 5) => {
  return new Promise((resolve) => {
    let currentUrl = initialUrl;
    let redirectsCount = 0;

    const requestHop = (targetUrl) => {
      try {
        const client = targetUrl.startsWith('https:') ? https : http;
        const req = client.get(
          targetUrl,
          {
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          },
          (res) => {
            // Handle redirects (301, 302, 303, 307, 308)
            if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
              redirectsCount++;
              if (redirectsCount > maxRedirects) {
                return resolve(null);
              }
              const redirectUrl = new URL(res.headers.location, targetUrl).href;
              return requestHop(redirectUrl);
            }

            if (res.statusCode !== 200) {
              return resolve(null);
            }

            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => resolve(Buffer.concat(chunks)));
            res.on('error', () => resolve(null));
          }
        );

        req.on('error', () => resolve(null));
        req.on('timeout', () => {
          req.destroy();
          resolve(null);
        });
      } catch (e) {
        resolve(null);
      }
    };

    requestHop(currentUrl);
  });
};

/**
 * Helper to get image buffer from DB, local disk, or URL
 */
const fetchImageBuffer = async (rawUrl) => {
  try {
    if (!rawUrl || typeof rawUrl !== 'string') return null;
    let url = rawUrl.trim();

    // 1. If it's a DB image URL like /api/posts/images/:id or https://.../api/posts/images/:id
    const dbMatch = url.match(/\/api\/posts\/images\/([a-fA-F0-9]{24})/);
    if (dbMatch && dbMatch[1]) {
      const imgDoc = await ImageFile.findById(dbMatch[1]);
      if (imgDoc && imgDoc.data) {
        return imgDoc.data;
      }
    }

    // 2. If it's a local /uploads/ URL
    if (url.includes('/uploads/')) {
      const fileName = url.split('/uploads/').pop();
      const localFilePath = path.join(__dirname, '..', 'uploads', fileName);
      if (fs.existsSync(localFilePath)) {
        return await fs.promises.readFile(localFilePath);
      }
      const tempPath = path.join(__dirname, '..', 'uploads', 'temp', fileName);
      if (fs.existsSync(tempPath)) {
        return await fs.promises.readFile(tempPath);
      }
      // Check MongoDB ImageFile by filename
      const imgByFile = await ImageFile.findOne({ filename: fileName });
      if (imgByFile && imgByFile.data) {
        return imgByFile.data;
      }
    }

    // 3. If external HTTP/HTTPS URL
    if (url.startsWith('http://') || url.startsWith('https://')) {
      // If Cloudinary URL, ensure we request .jpg for PDFKit compatibility
      let fetchUrl = url;
      if (url.includes('cloudinary.com') && !url.endsWith('.jpg') && !url.endsWith('.png')) {
        fetchUrl = url.replace(/\.(webp|avif|heic)$/i, '.jpg');
        if (!fetchUrl.includes('.jpg') && !fetchUrl.includes('.png')) {
          fetchUrl = `${fetchUrl}.jpg`;
        }
      }

      return await fetchRemoteBufferWithRedirects(fetchUrl);
    }

    return null;
  } catch (err) {
    return null;
  }
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
 * Internal helper to write post records to a PDFDocument
 */
const writePostsToDoc = async (doc, posts = [], user = {}, titleText = 'PHOTO & MEDIA DOCUMENTATION ARCHIVE') => {
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
        let imgBuffer = null;

        try {
          imgBuffer = await fetchImageBuffer(photo.url);
        } catch (_) {}

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
        .fillColor('#4338CA') // Indigo 700
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
 * Generate a complete, polished PDF archive containing all posts for a user
 */
const generateUserPostsPdf = async (posts = [], user = {}, clientOrigin = 'https://photodocs.onrender.com') => {
  return new Promise(async (resolve, reject) => {
    try {
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
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      await writePostsToDoc(doc, posts, user, 'PHOTO & MEDIA DOCUMENTATION ARCHIVE');
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Generate a clean PDF report for a single post
 */
const generateSinglePostPdf = async (post, user = {}, clientOrigin = 'https://photodocs.onrender.com') => {
  return new Promise(async (resolve, reject) => {
    try {
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
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const author = post.uploadedBy || user;
      await writePostsToDoc(doc, [post], author, 'OFFICIAL DOCUMENTATION REPORT');
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = {
  generateUserPostsPdf,
  generateSinglePostPdf
};

