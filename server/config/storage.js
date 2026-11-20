// Uploaded documents aur generated certificates ki folders.
// Default: repo root ke /uploads aur /certificates. Env se badal sakte hain (tests / deploy ke liye).
// DB mein sirf relative filename store hota hai.
require('./env');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');

const uploadsDir = path.resolve(process.env.UPLOADS_DIR || path.join(root, 'uploads'));
const certificatesDir = path.resolve(process.env.CERTIFICATES_DIR || path.join(root, 'certificates'));

fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(certificatesDir, { recursive: true });

module.exports = { uploadsDir, certificatesDir };
