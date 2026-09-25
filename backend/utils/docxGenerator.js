const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  ExternalHyperlink,
  ImageRun,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType
} = require('docx');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

// Helper to download an image buffer from URL or local path
const fetchImageBuffer = async (url) => {
  try {
    // If it's a local /uploads/ URL
    if (url.includes('/uploads/')) {
      const fileName = url.split('/uploads/').pop();
      const localFilePath = path.join(__dirname, '..', 'uploads', fileName);
      if (fs.existsSync(localFilePath)) {
        return await fs.promises.readFile(localFilePath);
      }
    }

    if (url.startsWith('http://') || url.startsWith('https://')) {
      return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        client
          .get(url, (res) => {
            if (res.statusCode !== 200) {
              return reject(new Error(`Failed to download image: ${res.statusCode}`));
            }
            const data = [];
            res.on('data', (chunk) => data.push(chunk));
            res.on('end', () => resolve(Buffer.concat(data)));
          })
          .on('error', reject);
      });
    }

    return null;
  } catch (err) {
    console.error(`[DocxGenerator] Image fetch error for ${url}:`, err.message);
    return null;
  }
};

const formatDate = (isoString) => {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

const formatTime = (isoString) => {
  const d = new Date(isoString);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Generate official Word Document (.docx) for a photo post
 * @param {Object} post Mongoose post document
 * @param {string} clientBaseUrl The frontend domain/origin
 * @returns {Promise<Buffer>}
 */
const generatePostDocx = async (post, clientBaseUrl = 'http://localhost:5173') => {
  const postDate = post.eventDate || post.createdAt;
  const formattedDate = formatDate(postDate);
  const formattedTime = formatTime(postDate);
  const contributor = post.uploadedBy ? post.uploadedBy.fullName || 'Anonymous' : 'Anonymous';
  const postUrl = `${clientBaseUrl}/post/${post._id}`;
  const galleryUrl = `${clientBaseUrl}/gallery`;

  const children = [];

  // Document Top Branding Banner
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: 'PUBLIC PHOTO DOCUMENTATION GALLERY',
          bold: true,
          size: 28,
          color: '2563EB',
          font: 'Arial'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: 'OFFICIAL ACTIVITY & EVENT PHOTO ARCHIVE REPORT',
          size: 20,
          color: '64748B',
          font: 'Arial'
        })
      ]
    })
  );

  // Large Prominent Heading / Title
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 150 },
      children: [
        new TextRun({
          text: post.title.toUpperCase(),
          bold: true,
          size: 36,
          color: '0F172A',
          font: 'Arial'
        })
      ]
    })
  );

  // Metadata Block (Contributor, Date, Time, ID)
  children.push(
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({ text: 'Uploaded By: ', bold: true, size: 22, color: '334155' }),
        new TextRun({ text: `${contributor}  |  `, size: 22, color: '1E293B' }),
        new TextRun({ text: 'Date: ', bold: true, size: 22, color: '334155' }),
        new TextRun({ text: `${formattedDate}  |  `, size: 22, color: '1E293B' }),
        new TextRun({ text: 'Time: ', bold: true, size: 22, color: '334155' }),
        new TextRun({ text: `${formattedTime}`, size: 22, color: '1E293B' })
      ]
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({ text: `Document ID: ${post._id}`, size: 18, color: '94A3B8' })
      ]
    })
  );

  // Divider
  children.push(
    new Paragraph({
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' }
      },
      spacing: { after: 200 }
    })
  );

  // Description / Activity Narrative
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 150, after: 100 },
      children: [
        new TextRun({
          text: 'Activity Description & Summary',
          bold: true,
          size: 24,
          color: '1E293B'
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 250 },
      children: [
        new TextRun({
          text: post.description,
          size: 22,
          color: '334155'
        })
      ]
    })
  );

  // Photos Header
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 120 },
      children: [
        new TextRun({
          text: `Documented Photographs (${post.photos ? post.photos.length : 0})`,
          bold: true,
          size: 24,
          color: '1E293B'
        })
      ]
    })
  );

  // Embed photos
  if (post.photos && post.photos.length > 0) {
    for (let i = 0; i < post.photos.length; i++) {
      const photo = post.photos[i];
      const buffer = await fetchImageBuffer(photo.url);

      if (buffer) {
        try {
          children.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 100, after: 80 },
              children: [
                new ImageRun({
                  data: buffer,
                  transformation: {
                    width: 480,
                    height: 300
                  }
                })
              ]
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 180 },
              children: [
                new TextRun({
                  text: `Photograph ${i + 1} of ${post.photos.length}: ${photo.originalName || 'Photo'}`,
                  italics: true,
                  size: 18,
                  color: '64748B'
                })
              ]
            })
          );
        } catch (imgErr) {
          console.error(`[DocxGenerator] Failed to embed image ${i}:`, imgErr.message);
        }
      } else {
        // Fallback textual record
        children.push(
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: `[Photograph ${i + 1}: ${photo.originalName || 'Image'} - Online URL: ${photo.url}]`,
                color: '2563EB',
                size: 20
              })
            ]
          })
        );
      }
    }
  }

  // Footer & Hyperlink Section as specified in requirements
  children.push(
    new Paragraph({
      border: {
        top: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' }
      },
      spacing: { before: 300, after: 120 }
    }),
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({ text: 'Online Digital Post: ', bold: true, size: 22 }),
        new ExternalHyperlink({
          children: [
            new TextRun({
              text: postUrl,
              style: 'Hyperlink',
              color: '2563EB',
              underline: {}
            })
          ],
          link: postUrl
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new ExternalHyperlink({
          children: [
            new TextRun({
              text: 'View Complete Photo Gallery',
              bold: true,
              size: 22,
              color: '2563EB',
              underline: {}
            })
          ],
          link: galleryUrl
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200 },
      children: [
        new TextRun({
          text: `Generated officially on ${new Date().toLocaleDateString('en-US')} by Public Photo Documentation Gallery System.`,
          size: 16,
          color: '94A3B8',
          italics: true
        })
      ]
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: children
      }
    ]
  });

  return await Packer.toBuffer(doc);
};

module.exports = {
  generatePostDocx
};
