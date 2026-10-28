const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide your full name'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Please provide an email address'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address'
      ]
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false
    },
    phone: {
      type: String,
      required: [true, 'Please provide a valid contact phone number'],
      trim: true
    },
    role: {
      type: String,
      enum: ['farmer', 'buyer', 'admin'],
      default: 'buyer'
    },
    location: {
      village: { type: String, default: '', trim: true },
      district: { type: String, default: '', trim: true },
      state: { type: String, default: '', trim: true }
    },
    isBlocked: {
      type: Boolean,
      default: false
    },
    isSeed: {
      type: Boolean,
      default: false,
      select: false
    },
    avatar: {
      type: String,
      default: ''
    },
    // Feature 6: Verified farmer badge
    isVerified: {
      type: Boolean,
      default: false
    },
    verificationDoc: {
      type: String, // URL or path to uploaded document
      default: ''
    },
    verificationStatus: {
      type: String,
      enum: ['none', 'pending', 'approved', 'rejected'],
      default: 'none'
    },
    verificationNote: {
      type: String, // Admin's note on rejection
      default: ''
    },
    // Integration 6 & 12: Phone OTP (Firebase) & Google OAuth
    firebaseUid: {
      type: String,
      default: ''
    },
    phoneVerified: {
      type: Boolean,
      default: false
    },
    googleId: {
      type: String,
      default: ''
    },
    // Integration 9: Farmer UPI ID for direct settlement QR
    upiId: {
      type: String,
      default: '',
      trim: true
    },
    // Integration 7: Pluggable Notification Channel Preferences
    notificationPreferences: {
      inapp: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      whatsapp: { type: Boolean, default: false }
    },
    // Integration 8: Optional user coordinates for distance calculation
    coordinates: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null }
    }
  },
  {
    timestamps: true
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Match entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
