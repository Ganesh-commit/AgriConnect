const crypto = require('crypto');
const User = require('../models/User');
const { sendTokenResponse } = require('../utils/jwt');

let firebaseAdmin = null;
try {
  firebaseAdmin = require('firebase-admin');
} catch {
  firebaseAdmin = null;
}

function isRealEnv(val) {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim();
  return trimmed.length > 0 && !trimmed.startsWith('your_');
}

function initFirebaseAdminIfConfigured() {
  if (!firebaseAdmin) return null;
  if (firebaseAdmin.apps && firebaseAdmin.apps.length > 0) {
    return firebaseAdmin.app();
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : '';

  if (isRealEnv(projectId) && isRealEnv(clientEmail) && isRealEnv(privateKey)) {
    try {
      return firebaseAdmin.initializeApp({
        credential: firebaseAdmin.credential.cert({
          projectId,
          clientEmail,
          privateKey
        })
      });
    } catch (err) {
      console.warn('[FirebaseAdmin] Init warning:', err.message);
    }
  }
  return null;
}

/**
 * Verifies a Firebase ID token using firebase-admin (if configured) or
 * Google's official Identity Toolkit lookup endpoint (https://identitytoolkit.googleapis.com/v1/accounts:lookup).
 */
async function verifyFirebaseIdToken(idToken) {
  if (!idToken) {
    throw new Error('Firebase ID token is required');
  }

  const app = initFirebaseAdminIfConfigured();
  if (app && firebaseAdmin) {
    const decoded = await firebaseAdmin.auth().verifyIdToken(idToken);
    return {
      uid: decoded.uid,
      phone: decoded.phone_number || '',
      email: decoded.email || ''
    };
  }

  const webApiKey = process.env.FIREBASE_WEB_API_KEY;
  if (isRealEnv(webApiKey)) {
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(
      webApiKey.trim()
    )}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });
    if (!res.ok) {
      throw new Error('Invalid or expired Firebase ID token');
    }
    const data = await res.json();
    const acc = data?.users?.[0];
    if (!acc) {
      throw new Error('Firebase user record not found');
    }
    return {
      uid: acc.localId,
      phone: acc.phoneNumber || '',
      email: acc.email || ''
    };
  }

  throw new Error(
    'Firebase Authentication is not configured on the server (set FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY or FIREBASE_WEB_API_KEY).'
  );
}

// @desc    Get configured auth providers (Firebase Phone OTP, Google OAuth)
// @route   GET /api/auth/providers
// @access  Public
const getAuthProviders = async (req, res) => {
  const firebaseOtpEnabled =
    (isRealEnv(process.env.FIREBASE_PROJECT_ID) &&
      isRealEnv(process.env.FIREBASE_CLIENT_EMAIL) &&
      isRealEnv(process.env.FIREBASE_PRIVATE_KEY)) ||
    isRealEnv(process.env.FIREBASE_WEB_API_KEY);

  const googleOAuthEnabled = isRealEnv(process.env.GOOGLE_CLIENT_ID);

  res.status(200).json({
    success: true,
    message: 'Auth providers status',
    data: {
      firebaseOtpEnabled,
      googleOAuthEnabled,
      googleClientId: googleOAuthEnabled ? process.env.GOOGLE_CLIENT_ID.trim() : null
    }
  });
};

// @desc    Register a new user (Farmer, Buyer, or Admin)
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, role, location, avatar } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists.'
      });
    }

    // Role safety check: default to buyer if not provided
    const userRole = ['farmer', 'buyer', 'admin'].includes(role) ? role : 'buyer';

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      phone,
      role: userRole,
      location: location || {},
      avatar: avatar || ''
    });

    sendTokenResponse(user, 201, res, 'Registration successful. Welcome to AgriConnect!');
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.'
      });
    }

    // Find user and include password field
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Check if blocked
    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended by an administrator. Please contact support.'
      });
    }

    // Verify password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    sendTokenResponse(user, 200, res, 'Logged in successfully.');
  } catch (error) {
    next(error);
  }
};

// @desc    Integration 6: Login or Register via Firebase Phone OTP
// @route   POST /api/auth/firebase-phone
// @access  Public
const firebasePhoneLogin = async (req, res, next) => {
  try {
    const { idToken, name, role = 'farmer', location } = req.body;
    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'Firebase ID token is required.',
        data: null
      });
    }

    const verified = await verifyFirebaseIdToken(idToken);
    if (!verified.phone) {
      return res.status(400).json({
        success: false,
        message: 'Verified Firebase token does not contain a phone number.',
        data: null
      });
    }

    // Normalize last 10 digits for matching existing accounts
    const digits = verified.phone.replace(/[^0-9]/g, '').slice(-10);
    let user = await User.findOne({
      $or: [
        { firebaseUid: verified.uid },
        { phone: verified.phone },
        ...(digits.length === 10 ? [{ phone: { $regex: `${digits}$` } }] : [])
      ]
    });

    if (!user) {
      const safeRole = ['farmer', 'buyer'].includes(role) ? role : 'farmer';
      const placeholderEmail =
        verified.email || `phone.${digits || verified.uid.slice(0, 8)}@agriconnect.in`;
      const randomPassword = crypto.randomBytes(16).toString('hex');

      user = await User.create({
        name: (name || `Kisan ${digits.slice(-4)}`).trim(),
        email: placeholderEmail.toLowerCase(),
        password: randomPassword,
        phone: verified.phone,
        phoneVerified: true,
        firebaseUid: verified.uid,
        role: safeRole,
        location: location || { state: 'Andhra Pradesh' }
      });
    } else {
      if (user.isBlocked) {
        return res.status(403).json({
          success: false,
          message: 'Your account has been suspended by an administrator.'
        });
      }
      user.firebaseUid = verified.uid;
      user.phoneVerified = true;
      await user.save();
    }

    sendTokenResponse(user, 200, res, 'Phone OTP verified and logged in!');
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message || 'Phone OTP verification failed.',
      data: null
    });
  }
};

// @desc    Integration 6: Link verified Firebase Phone OTP to existing logged-in account
// @route   PUT /api/auth/link-phone
// @access  Private
const linkPhoneToAccount = async (req, res, next) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'Firebase ID token is required to link phone number.',
        data: null
      });
    }

    const verified = await verifyFirebaseIdToken(idToken);
    if (!verified.phone) {
      return res.status(400).json({
        success: false,
        message: 'Verified token did not include a phone number.',
        data: null
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.phone = verified.phone;
    user.firebaseUid = verified.uid;
    user.phoneVerified = true;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `Phone number ${verified.phone} verified and linked to your account.`,
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Integration 12: Google OAuth Login (env-controlled)
// @route   POST /api/auth/google
// @access  Public
const googleLogin = async (req, res, next) => {
  try {
    const { credential, role = 'buyer' } = req.body;
    const configuredClientId = (process.env.GOOGLE_CLIENT_ID || '').trim();

    if (!isRealEnv(configuredClientId)) {
      return res.status(503).json({
        success: false,
        message: 'Google OAuth is not configured on this server.',
        data: null
      });
    }

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: 'Google credential token is required.',
        data: null
      });
    }

    // Verify ID token against Google's official oauth2 tokeninfo endpoint
    const verifyRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
    );

    if (!verifyRes.ok) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Google ID token.',
        data: null
      });
    }

    const payload = await verifyRes.json();
    if (payload.aud !== configuredClientId) {
      return res.status(401).json({
        success: false,
        message: 'Google token audience mismatch.',
        data: null
      });
    }

    const email = (payload.email || '').toLowerCase();
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Google account did not provide an email address.',
        data: null
      });
    }

    let user = await User.findOne({
      $or: [{ googleId: payload.sub }, { email }]
    });

    if (!user) {
      const safeRole = ['farmer', 'buyer'].includes(role) ? role : 'buyer';
      user = await User.create({
        name: payload.name || email.split('@')[0],
        email,
        password: crypto.randomBytes(16).toString('hex'),
        phone: '+91 90000 00000',
        role: safeRole,
        googleId: payload.sub,
        avatar: payload.picture || ''
      });
    } else {
      if (user.isBlocked) {
        return res.status(403).json({
          success: false,
          message: 'Your account has been suspended by an administrator.'
        });
      }
      if (!user.googleId) user.googleId = payload.sub;
      if (!user.avatar && payload.picture) user.avatar = payload.picture;
      await user.save();
    }

    sendTokenResponse(user, 200, res, 'Logged in with Google!');
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Log user out & clear cookie
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res, next) => {
  try {
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 5 * 1000),
      httpOnly: true
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAuthProviders,
  register,
  login,
  firebasePhoneLogin,
  linkPhoneToAccount,
  googleLogin,
  getMe,
  logout
};
