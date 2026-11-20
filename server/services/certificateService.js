const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs');
const PDFDocument = require('pdfkit');
const { Certificate } = require('../models');
const { certificateTypes } = require('../config/rqms');
const { certificatesDir } = require('../config/storage');
const httpError = require('../utils/httpError');
const { isUniqueError } = require('../utils/dbErrors');

// 'order_no' -> 'Order no'
function prettyLabel(key) {
  const text = key.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function writePdf(filePath, { title, number, issuedAt, payload }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 56 });
    const stream = fs.createWriteStream(filePath);
    stream.on('finish', resolve);
    stream.on('error', reject);
    doc.on('error', reject);
    doc.pipe(stream);

    doc.fontSize(10).fillColor('#555555').text('Railway Quarter Management System', { align: 'center' });
    doc.moveDown(0.5).fontSize(22).fillColor('#0b3d91').text(title, { align: 'center' });
    doc.moveDown(0.5).fontSize(11).fillColor('#000000').text(`Certificate No: ${number}`, { align: 'center' });
    doc.text(`Issued on: ${dayjs(issuedAt).format('DD MMM YYYY')}`, { align: 'center' });
    doc.moveDown(1.5);

    Object.keys(payload).forEach((key) => {
      const value = payload[key];
      if (value === null || value === undefined || value === '') return;
      doc.font('Helvetica-Bold').text(`${prettyLabel(key)}: `, { continued: true });
      doc.font('Helvetica').text(String(value));
      doc.moveDown(0.3);
    });

    doc.moveDown(3);
    doc.font('Helvetica').text('______________________________', { align: 'right' });
    doc.text('Authorised Signatory', { align: 'right' });
    doc.moveDown(2).fontSize(8).fillColor('#777777').text('This is a system-generated document.', { align: 'center' });
    doc.end();
  });
}

function makeNumber(prefix, date) {
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${dayjs(date).format('YYYYMMDD')}-${random}`;
}

// model = Sequelize instance (abhi Allotment). type = certificateTypes ka key (config/rqms.js).
// Transaction ke andar, flow ke AAKHIR mein call karo: PDF fail ho to poora transaction rollback.
async function generate(model, type, payload, issuedBy, transaction) {
  const config = certificateTypes[type];
  if (!config) throw httpError(500, `Unknown certificate type ${type}`);

  const issuedAt = new Date();
  let certificate = null;
  for (let attempt = 1; attempt <= 5 && !certificate; attempt += 1) {
    const number = makeNumber(config.prefix, issuedAt);
    try {
      certificate = await Certificate.create(
        {
          certifiable_type: model.constructor.name,
          certifiable_id: model.id,
          type,
          number,
          payload,
          file_path: `${number}.pdf`,
          is_signed: false,
          issued_by: issuedBy || null,
          issued_at: issuedAt,
        },
        { transaction }
      );
    } catch (err) {
      if (!isUniqueError(err) || attempt === 5) throw err;
    }
  }

  const filePath = path.join(certificatesDir, certificate.file_path);
  try {
    await writePdf(filePath, { title: config.title, number: certificate.number, issuedAt, payload });
  } catch (err) {
    fs.rmSync(filePath, { force: true });
    throw err;
  }
  return certificate;
}

module.exports = { generate };
