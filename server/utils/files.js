const fs = require('fs');

// Upload hui files hata do (validation / DB fail hone par orphan files na bachein). Errors ignore.
function removeFiles(files) {
  (files || []).forEach((file) => {
    try {
      fs.unlinkSync(file.path);
    } catch {
      // file pehle hi nahi hai — theek hai
    }
  });
}

module.exports = { removeFiles };
