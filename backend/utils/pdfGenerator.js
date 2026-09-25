const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const ImageFile = require('../models/ImageFile');

/**
 * Helper to get image buffer from DB, local disk, or URL
 */
const fetchImageBuffer = async (url) => {
  try {
    if (!url || typeof url !== 'string') return null;

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
      // Check MongoDB ImageFile by filename
      const imgByFile = await ImageFile.findOne({ filename: fileName });
      if (imgByFile && imgByFile.data) {
        return imgByFile.data;
      }
    }

    // 3. If external HTTP/HTTPS URL (e.g. Unsplash, Cloudinary)
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return new Promise((resolve) => {
        const client = url.startsWith('https') ? https : http;
        const req = client.get(url, { timeout: 8000 }, (res) => {
          if (res.statusCode !== 200) {
            return resolve(null);
          }
          const chunks = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => resolve(Buffer.concat(chunks)));
        });
        req.on('error', () => resolve(null));
        req.on('timeout', () => {
          req.destroy();
          resolve(null);
        });
      });
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
 * Generate a complete, polished PDF archive containing all posts for a user
 * @param {Array} posts Array of post documents
 * @param {Object} user User object
 * @param {string} clientOrigin Frontend base URL
 * @returns {Promise<Buffer>}
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

      const pageWidth = doc.page.width - 90; // 595.28 - 90 = ~505

      // ================= COVER / HEADER BANNER =================
      doc
        .rect(45, 45, pageWidth, 90)
        .fill('#1E293B'); // Slate 800

      doc
        .fillColor('#FFFFFF')
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('PHOTO & MEDIA DOCUMENTATION ARCHIVE', 60, 62, {
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

      // ================= CONTRIBUTOR PROFILE CARD =================
      const profileTop = 150;
      doc
        .rect(45, profileTop, pageWidth, 55)
        .fillAndStroke('#F8FAFC', '#E2E8F0');

      doc
        .fillColor('#0F172A')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(`Contributor: ${user.fullName || 'Author'}`, 60, profileTop + 12);

      doc
        .fillColor('#64748B')
        .fontSize(9)
        .font('Helvetica')
        .text(`Email: ${user.email || 'Registered User'}  •  Role: ${user.role || 'USER'}`, 60, profileTop + 30);

      let currentY = profileTop + 75;

      // If no posts found
      if (!posts || posts.length === 0) {
        doc
          .fillColor('#64748B')
          .fontSize(13)
          .font('Helvetica')
          .text('No documentation records have been published yet.', 45, currentY + 30, {
            align: 'center',
            width: pageWidth
          });
        doc.end();
        return;
      }

      // ================= RENDER EACH POST =================
      for (let pIndex = 0; pIndex < posts.length; pIndex++) {
        const post = posts[pIndex];
        const { dateStr, timeStr } = formatDateTime(post.eventDate || post.createdAt);
        const postNumber = pIndex + 1;

        // Check if remaining space is too low, add page
        if (currentY > doc.page.height - 180) {
          doc.addPage();
          currentY = 45;
        }

        // Post Header Line / Separator
        doc
          .strokeColor('#CBD5E1')
          .lineWidth(1)
          .moveTo(45, currentY)
          .lineTo(45 + pageWidth, currentY)
          .stroke();

        currentY += 14;

        // Post Badge & Title
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
        doc
          .fillColor('#475569')
          .fontSize(9)
          .font('Helvetica')
          .text(
            `Date: ${dateStr}   |   Time: ${timeStr}   |   By: ${post.uploadedBy?.fullName || user.fullName || 'Author'}`,
            45,
            currentY
          );

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

        // ================= EMBED PHOTOS (IF ANY) =================
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
            const imgBuffer = await fetchImageBuffer(photo.url);

            if (imgBuffer) {
              try {
                // Check if image fits on current page (requires ~220pt)
                if (currentY + 210 > doc.page.height - 45) {
                  doc.addPage();
                  currentY = 45;
                }

                const maxImgW = Math.min(pageWidth, 380);
                const maxImgH = 220;

                doc.image(imgBuffer, 45, currentY, {
                  fit: [maxImgW, maxImgH],
                  align: 'center'
                });

                currentY += maxImgH + 6;

                // Photo Caption
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

                currentY = doc.y + 12;
              } catch (embedErr) {
                // If PDFKit cannot decode specific image format, write clean textual badge
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

        // ================= EMBED VIDEOS (IF ANY) =================
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

            // Video card box
            const boxH = 42;
            doc
              .rect(45, currentY, pageWidth, boxH)
              .fillAndStroke('#EEF2FF', '#C7D2FE'); // Indigo 50 & 200

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

        // If neither photos nor videos
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

      // Finalize PDF
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = {
  generateUserPostsPdf
};
