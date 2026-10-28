const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary if environment variables are provided
const hasCloudinary = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (hasCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

// Ensure local uploads directory exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Disk storage for local uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `crop-${uniqueSuffix}${ext}`);
  }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files (jpeg, jpg, png, webp) are permitted.'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter
});

// Helper to process uploaded files (Cloudinary or local fallback)
const processUploadedFiles = async (files) => {
  if (!files || files.length === 0) return [];

  const fileList = Array.isArray(files) ? files : [files];
  const urls = [];

  for (const file of fileList) {
    if (hasCloudinary) {
      try {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: 'agriconnect/crops',
          transformation: [{ width: 1200, height: 800, crop: 'limit', quality: 'auto' }]
        });
        // Safely remove local file after successful Cloudinary upload
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        urls.push(result.secure_url);
        continue;
      } catch (cloudErr) {
        console.warn('Cloudinary upload failed, falling back to local storage:', cloudErr.message);
      }
    }
    // Local fallback URL
    const relativeUrl = `/uploads/${file.filename}`;
    urls.push(relativeUrl);
  }

  return urls;
};

module.exports = {
  upload,
  processUploadedFiles,
  hasCloudinary
};
