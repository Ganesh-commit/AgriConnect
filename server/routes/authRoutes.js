const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

const {
  getAuthProviders,
  register,
  login,
  firebasePhoneLogin,
  linkPhoneToAccount,
  googleLogin,
  getMe,
  logout
} = require('../controllers/authController');

const { protect } = require('../middleware/auth');

// Middleware to check validation results
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMsg = errors.array().map((e) => e.msg).join(', ');
    return res.status(400).json({
      success: false,
      message: errorMsg,
      errors: errors.array()
    });
  }
  next();
};

// Register validation rules
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Full name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .isLength({ min: 10, max: 15 })
    .withMessage('Phone number must be between 10 and 15 digits'),
  body('role')
    .optional()
    .isIn(['farmer', 'buyer', 'admin'])
    .withMessage('Role must be either farmer, buyer, or admin'),
  validate
];

// Login validation rules
const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  validate
];

router.get('/providers', getAuthProviders);
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/firebase-phone', firebasePhoneLogin);
router.put('/link-phone', protect, linkPhoneToAccount);
router.post('/google', googleLogin);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

module.exports = router;
