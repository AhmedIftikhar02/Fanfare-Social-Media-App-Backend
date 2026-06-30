// src/middlewares/upload.js

const multer     = require('multer');
const path       = require('path');
const { Readable } = require('stream');
const AppError   = require('../utils/AppError');
const cloudinary = require('../config/cloudinary');

// ─── Constants ────────────────────────────────────────────────────────────────
const IMAGE_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const VIDEO_MIMES = ['video/mp4', 'video/quicktime', 'video/x-matroska', 'video/mpeg'];
const ALL_ALLOWED = [...IMAGE_MIMES, ...VIDEO_MIMES];

const IMAGE_MAX_BYTES        = 10 * 1024 * 1024;  // 10 MB
const POST_VIDEO_MAX_BYTES   = 100 * 1024 * 1024; // 100 MB
const STATUS_VIDEO_MAX_BYTES = 50  * 1024 * 1024; // 50 MB
const REEL_MAX_SIZE          = 100 * 1024 * 1024; // 100 MB
const MESSAGE_VIDEO_MAX_BYTES= 50  * 1024 * 1024; // 50 MB

// ─── Multer factory (memory storage — buffer only, never touches disk) ───────
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

// ─── Core: upload an in-memory buffer straight to Cloudinary ─────────────────
const uploadBufferToCloudinary = (buffer, folder, resourceType) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder:        `fanfare/${folder}`,
        resource_type: resourceType, // 'image' | 'video'
        // Auto-optimize delivery (format + quality) without losing visible quality
        ...(resourceType === 'image'
          ? { transformation: [{ width: 1080, height: 1080, crop: 'limit', quality: 'auto:good' }] }
          : {}),
      },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    Readable.from(buffer).pipe(stream);
  });

// ─── Thumbnail URL builders (no extra upload — Cloudinary derives on the fly) ─
const buildImageThumbUrl = (secureUrl) =>
  secureUrl.replace('/upload/', '/upload/c_fill,w_300,h_300,g_auto,q_auto/');

const buildVideoThumbUrl = (secureUrl) =>
  secureUrl
    .replace('/upload/', '/upload/so_1,c_fill,w_300,h_300,q_auto/')
    .replace(/\.(mp4|mov|mkv|mpeg)$/i, '.jpg');

// ─── Generic processor: posts / messages (multi or single file, no thumbnail) ─
const makeProcessor = (folder, imageMaxBytes) => async (req, _res, next) => {
  let filesToProcess = [];
  if (req.files && req.files.length > 0) filesToProcess = req.files;
  else if (req.file) filesToProcess = [req.file];

  if (filesToProcess.length === 0) {
    req.processedFiles = [];
    return next();
  }

  try {
    const processed = [];
    for (let i = 0; i < filesToProcess.length; i++) {
      const file    = filesToProcess[i];
      const isImage = IMAGE_MIMES.includes(file.mimetype);

      if (isImage && file.size > imageMaxBytes) {
        return next(new AppError(`Image too large (max ${imageMaxBytes / 1024 / 1024} MB): ${file.originalname}`, 400));
      }

      const result = await uploadBufferToCloudinary(
        file.buffer,
        folder,
        isImage ? 'image' : 'video'
      );

      processed.push({
        filename:  result.public_id,     // store the Cloudinary public_id — needed to delete later
        mediaUrl:  result.secure_url,
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

// ─── Delete a file from Cloudinary by its stored public_id ───────────────────
const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (_) {
    // best-effort — never block the delete API response on cleanup failure
  }
};

// ─── Posts exports ────────────────────────────────────────────────────────────
const uploadPostMedia  = makeMulter(POST_VIDEO_MAX_BYTES, 10).array('media', 10);
const processPostFiles = makeProcessor('posts', IMAGE_MAX_BYTES);
const deletePostFile    = (publicId, mediaType) =>
  deleteFromCloudinary(publicId, mediaType === 'video' ? 'video' : 'image');

// ─── Statuses: media + auto thumbnail (image crop OR real video frame) ───────
const uploadStatusMedia = makeMulter(STATUS_VIDEO_MAX_BYTES, 1).single('status');

const processStatusFile = async (req, _res, next) => {
  if (!req.file) {
    req.processedFiles = [];
    return next();
  }

  const file    = req.file;
  const isImage = IMAGE_MIMES.includes(file.mimetype);

  if (isImage && file.size > IMAGE_MAX_BYTES) {
    return next(new AppError(`Image too large (max ${IMAGE_MAX_BYTES / 1024 / 1024} MB)`, 400));
  }

  try {
    const result = await uploadBufferToCloudinary(
      file.buffer,
      'statuses',
      isImage ? 'image' : 'video'
    );

    const thumbnailUrl = isImage
      ? buildImageThumbUrl(result.secure_url)
      : buildVideoThumbUrl(result.secure_url);

    req.processedFiles = [{
      filename:          result.public_id,
      mediaUrl:          result.secure_url,
      mediaType:         isImage ? 'image' : 'video',
      thumbnailFilename: null,           // derived URL, no separate asset to track
      thumbnailUrl,
      order: 0,
    }];

    next();
  } catch (err) {
    next(err);
  }
};

const deleteStatusFile      = (publicId, mediaType) =>
  deleteFromCloudinary(publicId, mediaType === 'video' ? 'video' : 'image');
const deleteStatusThumbnail = async () => {}; // no-op — thumbnail is a derived URL, not a stored asset

// ─── Avatars ──────────────────────────────────────────────────────────────────
const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
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

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder:         'fanfare/avatars',
          resource_type:  'image',
          public_id:      `avatar_${req.user.id}_${Date.now()}`,
          transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face', quality: 'auto:good' }],
        },
        (err, res) => (err ? reject(err) : resolve(res))
      );
      Readable.from(req.file.buffer).pipe(stream);
    });

    req.avatarFilename = result.public_id; // store as the new "filename" — it's now the Cloudinary public_id
    req.avatarUrl      = result.secure_url;
    next();
  } catch (err) {
    next(err);
  }
};

const deleteAvatarFile = (publicId) => deleteFromCloudinary(publicId, 'image');

// ─── Messages ─────────────────────────────────────────────────────────────────
const uploadMessageMedia = makeMulter(MESSAGE_VIDEO_MAX_BYTES, 1).single('media');
const processMessageFile = makeProcessor('messages', IMAGE_MAX_BYTES);
const deleteMessageFile  = (publicId, mediaType) =>
  deleteFromCloudinary(publicId, mediaType === 'video' ? 'video' : 'image');

// ─── Reels (single video) ─────────────────────────────────────────────────────
const uploadReelMedia = makeMulter(REEL_MAX_SIZE, 1).single('video');

const processReelFile = async (req, _res, next) => {
  if (!req.file) return next(new AppError('A video file is required for reels', 400));

  try {
    const result = await uploadBufferToCloudinary(req.file.buffer, 'posts', 'video');
    req.reelFile = {
      filename:  result.public_id,
      mediaUrl:  result.secure_url,
      mediaType: 'video',
      order:     0,
    };
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  uploadPostMedia,
  processPostFiles,
  deletePostFile,
  uploadStatusMedia,
  processStatusFile,
  deleteStatusFile,
  deleteStatusThumbnail,
  uploadAvatar,
  processAvatar,
  deleteAvatarFile,
  uploadReelMedia,
  processReelFile,
  uploadMessageMedia,
  processMessageFile,
  deleteMessageFile,
};