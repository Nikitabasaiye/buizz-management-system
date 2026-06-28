const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { AppError } = require('../middleware/errorHandler');

// Create upload directories if they don't exist
const createUploadDirs = () => {
  const dirs = [
    path.join(__dirname, '../../storage/kyc-documents'),
    path.join(__dirname, '../../storage/kyc-documents/pan'),
    path.join(__dirname, '../../storage/kyc-documents/address-proof'),
    path.join(__dirname, '../../storage/kyc-documents/aadhaar'),
    path.join(__dirname, '../../storage/kyc-documents/bank-documents'),
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

createUploadDirs();

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const docType = req.body.documentType || 'general';
    let uploadPath = path.join(__dirname, '../../storage/kyc-documents');
    
    // Organize by document type
    if (docType === 'pan') {
      uploadPath = path.join(uploadPath, 'pan');
    } else if (docType === 'address_proof') {
      uploadPath = path.join(uploadPath, 'address-proof');
    } else if (docType === 'aadhaar') {
      uploadPath = path.join(uploadPath, 'aadhaar');
    } else if (docType.includes('bank') || docType === 'cancelled_cheque_or_passbook') {
      uploadPath = path.join(uploadPath, 'bank-documents');
    }

    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const userId = req.user?.id || 'unknown';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const docType = req.body.documentType || 'doc';
    
    // Create unique filename: userId_docType_timestamp.ext
    const filename = `${userId}_${docType}_${timestamp}${ext}`;
    cb(null, filename);
  }
});

// File filter - only allow specific file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'application/pdf',
    'image/webp'
  ];

  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new AppError('Invalid file type. Only JPG, PNG, GIF, PDF, and WEBP are allowed', 400), false);
  }
};

// Multer configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// Cloudinary configuration (optional)
let cloudinary = null;
try {
  cloudinary = require('cloudinary').v2;
  
  if (process.env.CLOUDINARY_CLOUD_NAME && 
      process.env.CLOUDINARY_API_KEY && 
      process.env.CLOUDINARY_API_SECRET) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
  }
} catch (error) {
  console.log('Cloudinary not configured');
}

// Upload to cloudinary (if configured)
const uploadToCloudinary = async (filePath, folder = 'kyc-documents') => {
  if (!cloudinary || !process.env.CLOUDINARY_CLOUD_NAME) {
    return null;
  }

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
      resource_type: 'auto',
      allowed_formats: ['jpg', 'png', 'pdf', 'gif', 'webp']
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      size: result.bytes
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return null;
  }
};

// Delete file from cloudinary
const deleteFromCloudinary = async (publicId) => {
  if (!cloudinary || !publicId) {
    return false;
  }

  try {
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return false;
  }
};

// Delete local file
const deleteLocalFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Local file delete error:', error);
    return false;
  }
};

module.exports = {
  upload,
  uploadToCloudinary,
  deleteFromCloudinary,
  deleteLocalFile,
  cloudinary
};
