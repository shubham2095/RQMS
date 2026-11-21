const crypto = require('crypto');
const fs = require('fs');

// File ka sha256 (hex, 64 chars). Stream karta hai — badi file bhi memory mein nahi aati.
function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

module.exports = { sha256File };
