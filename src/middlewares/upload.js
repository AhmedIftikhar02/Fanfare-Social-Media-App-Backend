// src/middlewares/upload.js

const multer   = require('multer');
const sharp    = require('sharp');
const path     = require('path');
const fs       = require('fs');
const { v4: uuidv4 } = require('uuid');
const AppError = require('../utils/AppError');

// ─── Constants ────────────────────────────────────────────────────────────────
const IMAGE_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const VIDEO_MIMES = ['video/mp4', 'video/quicktime', 'video/x-matroska', 'video/mpeg'];
const ALL_ALLOWED = [...IMAGE_MIMES, ...VIDEO_MIMES];

const IMAGE_MAX_BYTES        = 10 * 1024 * 1024;  // 10 MB
const POST_VIDEO_MAX_BYTES   = 100 * 1024 * 1024; // 100 MB
const STATUS_VIDEO_MAX_BYTES = 50  * 1024 * 1024; // 50 MB

// ─── Directory factory ────────────────────────────────────────────────────────
const getUploadDir = (subfolder) => {
  const dir = process.env.VERCEL
    ? `/tmp/uploads/${subfolder}`
    : path.join(process.cwd(), 'uploads', subfolder);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
};

// ─── Multer factory ───────────────────────────────────────────────────────────
const makeMulter = (maxFileSize, maxFiles) =>
  multer({
    storage: multer.memoryStorage(),
    fileFilter: (_req, file, cb) => {
      ALL_ALLOWED.includes(file.mimetype)
        ? cb(null, true)
        : cb(new AppError(`File type not allowed: ${file.mimetype}`, 400), false);
    },
    limits: { files: maxFiles, fileSize: maxFileSize },
  });

// ─── Process & save files (shared logic) ─────────────────────────────────────
const makeProcessor = (subfolder, imageMaxBytes) => async (req, _res, next) => {
  let filesToProcess = [];
  if (req.files && req.files.length > 0) {
    filesToProcess = req.files;
  } else if (req.file) {
    filesToProcess = [req.file];
  }

  if (filesToProcess.length === 0) {
    req.processedFiles = [];
    return next();
  }

  const UPLOAD_DIR = getUploadDir(subfolder);
  const BASE_URL   = process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
  const processed  = [];

  try {
    for (let i = 0; i < filesToProcess.length; i++) {
      const file    = filesToProcess[i];
      const isImage = IMAGE_MIMES.includes(file.mimetype);

      if (isImage && file.size > imageMaxBytes) {
        return next(new AppError(`Image too large (max ${imageMaxBytes / 1024 / 1024} MB): ${file.originalname}`, 400));
      }

      const ext      = isImage ? 'jpg' : (path.extname(file.originalname).slice(1) || 'mp4');
      const filename = `${uuidv4()}.${ext}`;
      const filepath = path.join(UPLOAD_DIR, filename);

      if (isImage) {
        await sharp(file.buffer)
          .resize({ width: 1080, height: 1080, fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toFile(filepath);
      } else {
        fs.writeFileSync(filepath, file.buffer);
      }

      processed.push({
        filename,
        mediaUrl:  `${BASE_URL}/uploads/${subfolder}/${filename}`,
        mediaType: isImage ? 'image' : 'video',
        order:     i,
      });
    }

    req.processedFiles = processed;
    next();
  } catch (err) {
    next(err);
  }
};

// ─── Helper: delete a file from a subfolder ───────────────────────────────────
const deleteUploadedFile = (subfolder, filename) => {
  const filepath = path.join(getUploadDir(subfolder), filename);
  try {
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
  } catch (_) {
    // silent — best-effort cleanup
  }
};

// ─── Posts exports ────────────────────────────────────────────────────────────
const uploadPostMedia    = makeMulter(POST_VIDEO_MAX_BYTES, 10).array('media', 10);
const processPostFiles   = makeProcessor('posts', IMAGE_MAX_BYTES);
const deletePostFile     = (filename) => deleteUploadedFile('posts', filename);

// ─── Statuses exports ─────────────────────────────────────────────────────────
const uploadStatusMedia  = makeMulter(STATUS_VIDEO_MAX_BYTES, 1).single('status');
const processStatusFile  = makeProcessor('statuses', IMAGE_MAX_BYTES);
const deleteStatusFile   = (filename) => deleteUploadedFile('statuses', filename);

// ─── Avatar Specific Engines (Module 08 Added Core) ──────────────────────────
const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB Max
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new AppError('Only image files are allowed for avatar', 400), false);
    }
    cb(null, true);
  },
}).single('avatar');

const processAvatar = async (req, _res, next) => {
  try {
    if (!req.file) return next(new AppError('Avatar image file is required', 400));

    const UPLOAD_DIR = getUploadDir('avatars');
    const BASE_URL   = process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    
    const filename = `avatar_${req.user.id}_${Date.now()}.jpg`;
    const filepath = path.join(UPLOAD_DIR, filename);

    await sharp(req.file.buffer)
      .resize(400, 400, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 85 })
      .toFile(filepath);

    req.avatarFilename = filename;
    req.avatarUrl      = `${BASE_URL}/uploads/avatars/${filename}`;
    next();
  } catch (err) {
    next(err);
  }
};

const deleteAvatarFile = (filename) => deleteUploadedFile('avatars', filename);

module.exports = {
  uploadPostMedia,
  processPostFiles,
  deletePostFile,
  uploadStatusMedia,
  processStatusFile,
  deleteStatusFile,
  uploadAvatar,
  processAvatar,
  deleteAvatarFile,
};