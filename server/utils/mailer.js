const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('[Mailer] EMAIL_USER / EMAIL_PASS not set – emails disabled.');
    return null;
  }
  transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
  return transporter;
};

/**
 * Send an email notification.
 * @param {string} to   - recipient email
 * @param {string} subject
 * @param {string} html - HTML body
 */
const sendEmail = async (to, subject, html) => {
  const t = getTransporter();
  if (!t) return; // silently skip if not configured
  try {
    await t.sendMail({
      from: `"AgriConnect 🌾" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    });
  } catch (err) {
    console.error('[Mailer] Failed to send email:', err.message);
  }
};

// Email templates
const emailTemplates = {
  orderPlaced: (farmerName, buyerName, cropName, quantity, unit) => ({
    subject: `New Order Request – ${cropName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#16a34a,#15803d);padding:24px;text-align:center">
          <h1 style="color:white;margin:0;font-size:24px">🌾 AgriConnect</h1>
        </div>
        <div style="padding:24px">
          <h2 style="color:#15803d">Hi ${farmerName}!</h2>
          <p style="color:#374151;font-size:15px">You have received a new order request.</p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0">
            <p style="margin:4px 0"><strong>Buyer:</strong> ${buyerName}</p>
            <p style="margin:4px 0"><strong>Crop:</strong> ${cropName}</p>
            <p style="margin:4px 0"><strong>Quantity:</strong> ${quantity} ${unit}</p>
          </div>
          <p>Please log in to <a href="${process.env.CLIENT_URL}" style="color:#16a34a">AgriConnect</a> to review and respond.</p>
        </div>
      </div>`
  }),

  orderStatusUpdate: (buyerName, cropName, status) => ({
    subject: `Order Update – ${cropName} is now ${status}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#16a34a,#15803d);padding:24px;text-align:center">
          <h1 style="color:white;margin:0;font-size:24px">🌾 AgriConnect</h1>
        </div>
        <div style="padding:24px">
          <h2 style="color:#15803d">Hi ${buyerName}!</h2>
          <p style="color:#374151;font-size:15px">Your order for <strong>${cropName}</strong> has been <strong>${status}</strong> by the farmer.</p>
          <a href="${process.env.CLIENT_URL}/buyer/orders" style="display:inline-block;background:#16a34a;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px">View Orders</a>
        </div>
      </div>`
  }),

  verificationUpdate: (farmerName, status, note) => ({
    subject: `Farmer Verification – ${status}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#16a34a,#15803d);padding:24px;text-align:center">
          <h1 style="color:white;margin:0;font-size:24px">🌾 AgriConnect</h1>
        </div>
        <div style="padding:24px">
          <h2 style="color:#15803d">Hi ${farmerName}!</h2>
          <p style="color:#374151;font-size:15px">Your verification request has been <strong>${status}</strong>.</p>
          ${note ? `<p style="color:#6b7280;font-size:14px"><em>Note from admin: ${note}</em></p>` : ''}
          <a href="${process.env.CLIENT_URL}/profile" style="display:inline-block;background:#16a34a;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px">View Profile</a>
        </div>
      </div>`
  })
};

module.exports = { sendEmail, emailTemplates };
