const crypto = require('crypto');
const multer = require('multer');
const { uploadsDir } = require('../config/storage');
const { uploads } = require('../config/rqms');
const httpError = require('../utils/httpError');

// Extension user ke filename se nahi, mime se tay hoti hai (safe).
const EXTENSIONS = { 'application/pdf': '.pdf', 'image/jpeg': '.jpg', 'image/png': '.png' };

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const random = crypto.randomBytes(12).toString('hex');
    cb(null, `${Date.now()}-${random}${EXTENSIONS[file.mimetype] || ''}`);
  },
});

function fileFilter(req, file, cb) {
  if (!uploads.allowedMimeTypes.includes(file.mimetype)) {
    return cb(httpError(400, `"${file.originalname}" is not allowed. Upload PDF, JPG or PNG files only.`));
  }
  return cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: uploads.maxFileSizeBytes, files: uploads.maxFiles },
});

const uploadDocuments = upload.array('documents', uploads.maxFiles);

function toHttpError(err) {
  if (err.status) return err; // httpError (fileFilter)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return httpError(400, `A file is too large (max ${uploads.maxFileSizeBytes / 1024 / 1024} MB each)`);
  }
  if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
    return httpError(400, `Too many files (max ${uploads.maxFiles})`);
  }
  return httpError(400, err.message);
}

// multipart parse karo: fields -> req.body, files -> req.files (field name "documents").
// Multer khud error par saved files hata deta hai; validation fail hone par controller hatata hai.
function handleUpload(req, res, next) {
  uploadDocuments(req, res, (err) => {
    if (err) return next(toHttpError(err));
    return next();
  });
}

module.exports = handleUpload;
