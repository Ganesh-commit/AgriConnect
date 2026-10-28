const jwt = require('jsonwebtoken');

// Generate JWT signed token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Send JWT token via cookie & JSON response
const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  const token = generateToken(user._id);

  const cookieExpireDays = parseInt(process.env.COOKIE_EXPIRE, 10) || 7;
  const isProd = process.env.NODE_ENV === 'production';
  const options = {
    expires: new Date(Date.now() + cookieExpireDays * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax'
  };

  // Convert to clean object without password
  const userObj = user.toObject ? user.toObject() : { ...user };
  delete userObj.password;

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      message,
      token,
      data: {
        user: userObj
      }
    });
};

module.exports = {
  generateToken,
  sendTokenResponse
};
