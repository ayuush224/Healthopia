const fs = require('fs');
const path = require('path');
const multer = require('multer');

const { AppError } = require('../utils/errors');

const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
const MAX_POST_IMAGE_BYTES = 512 * 1024;
const IMAGE_LIMIT_MESSAGE = 'Image must be 512KB or smaller.';

fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadsDir);
  },
  filename: (_req, file, callback) => {
    const safeBaseName = path
      .basename(file.originalname, path.extname(file.originalname))
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .slice(0, 50) || 'post-image';

    callback(null, `${Date.now()}-${safeBaseName}${path.extname(file.originalname).toLowerCase()}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_POST_IMAGE_BYTES
  },
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype.startsWith('image/')) {
      callback(new AppError('Only image uploads are allowed.', 400));
      return;
    }

    callback(null, true);
  }
});

function uploadPostImage(req, res, next) {
  upload.single('image')(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        next(new AppError(IMAGE_LIMIT_MESSAGE, 400));
        return;
      }

      next(new AppError(error.message, 400));
      return;
    }

    next(error);
  });
}

module.exports = {
  uploadPostImage
};
