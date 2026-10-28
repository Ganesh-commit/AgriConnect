/**
 * Pluggable Multi-Channel Notifier Service
 * Channels:
 *   - "inapp" (Always active: saves Notification doc + emits real-time Socket.io event)
 *   - "email" (Nodemailer via SMTP_HOST/SMTP_USER/SMTP_PASS or EMAIL_USER/EMAIL_PASS)
 *   - "sms"   (Twilio REST API or MSG91 v5 API when env keys exist; dev console log fallback)
 *   - "whatsapp" (Meta WhatsApp Cloud API when env keys exist; dev console log fallback)
 */

const nodemailer = require('nodemailer');
const Notification = require('../../models/Notification');
const User = require('../../models/User');
const { emailTemplates } = require('../../utils/mailer');

let _io = null;
let _smtpTransporter = null;

function setSocketIO(io) {
  _io = io;
}

function getSocketIO() {
  return _io;
}

function isRealValue(val) {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim();
  return (
    trimmed.length > 0 &&
    !trimmed.startsWith('your_') &&
    trimmed !== 'your_email@gmail.com'
  );
}

function getChannelStatus() {
  const emailConfigured =
    (isRealValue(process.env.SMTP_USER) && isRealValue(process.env.SMTP_PASS)) ||
    (isRealValue(process.env.EMAIL_USER) && isRealValue(process.env.EMAIL_PASS));

  const twilioConfigured =
    isRealValue(process.env.TWILIO_ACCOUNT_SID) &&
    isRealValue(process.env.TWILIO_AUTH_TOKEN) &&
    isRealValue(process.env.TWILIO_FROM_NUMBER);

  const msg91Configured = isRealValue(process.env.MSG91_AUTH_KEY);

  const whatsappConfigured =
    isRealValue(process.env.WHATSAPP_ACCESS_TOKEN) &&
    isRealValue(process.env.WHATSAPP_PHONE_NUMBER_ID);

  return {
    inapp: { enabled: true, provider: 'mongodb+socketio' },
    email: {
      enabled: emailConfigured,
      provider: isRealValue(process.env.SMTP_HOST) ? 'smtp' : 'gmail'
    },
    sms: {
      enabled: twilioConfigured || msg91Configured,
      provider: twilioConfigured ? 'twilio' : msg91Configured ? 'msg91' : 'dev-console'
    },
    whatsapp: {
      enabled: whatsappConfigured,
      provider: whatsappConfigured ? 'whatsapp-cloud-api' : 'dev-console'
    }
  };
}

function getSmtpTransporter() {
  if (_smtpTransporter) return _smtpTransporter;

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT, 10) || 587;
  const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  if (!isRealValue(smtpUser) || !isRealValue(smtpPass)) {
    return null;
  }

  if (isRealValue(smtpHost)) {
    _smtpTransporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass }
    });
  } else {
    _smtpTransporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: { user: smtpUser, pass: smtpPass }
    });
  }
  return _smtpTransporter;
}

/**
 * Channel 1: In-App Notification (MongoDB + Socket.io)
 */
async function sendInApp({ userId, type = 'general', title, message, link = '', relatedDoc = null }) {
  try {
    const notification = await Notification.create({
      user: userId,
      type,
      title,
      message,
      link,
      relatedDoc
    });

    if (_io) {
      _io.to(`user:${userId}`).emit('new_notification', { notification });
    }
    return notification;
  } catch (err) {
    console.error('[Notifier:inapp] Error creating notification:', err.message);
    return null;
  }
}

/**
 * Channel 2: Email Notification (Nodemailer)
 */
async function sendEmailChannel({ to, subject, html, text }) {
  if (!to) return false;
  const transporter = getSmtpTransporter();
  const fromAddr =
    process.env.SMTP_FROM ||
    process.env.SMTP_USER ||
    process.env.EMAIL_USER ||
    'no-reply@agriconnect.local';

  if (!transporter) {
    if (process.env.NODE_ENV !== 'production') {
      console.info(`[Notifier:email (dev-log)] To=${to} | Subject="${subject}" | Body="${text || titleFromHtml(html)}"`);
    }
    return false;
  }

  try {
    await transporter.sendMail({
      from: `"AgriConnect 🌾" <${fromAddr}>`,
      to,
      subject,
      html: html || `<p>${text}</p>`,
      text
    });
    return true;
  } catch (err) {
    console.error('[Notifier:email] Failed to send email:', err.message);
    return false;
  }
}

function titleFromHtml(html = '') {
  return String(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140);
}

/**
 * Channel 3: SMS Notification (Twilio or MSG91)
 */
async function sendSmsChannel({ phone, message }) {
  if (!phone) return false;
  const status = getChannelStatus().sms;

  if (!status.enabled) {
    if (process.env.NODE_ENV !== 'production') {
      console.info(`[Notifier:sms (dev-log)] To=${phone} | Text="${message}"`);
    }
    return false;
  }

  try {
    if (status.provider === 'twilio') {
      const sid = process.env.TWILIO_ACCOUNT_SID.trim();
      const token = process.env.TWILIO_AUTH_TOKEN.trim();
      const from = process.env.TWILIO_FROM_NUMBER.trim();
      const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`;
      const body = new URLSearchParams({
        To: phone,
        From: from,
        Body: message
      });
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
      });
      return res.ok;
    }

    if (status.provider === 'msg91') {
      const authKey = process.env.MSG91_AUTH_KEY.trim();
      const templateId = (process.env.MSG91_TEMPLATE_ID || '').trim();
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      const res = await fetch('https://control.msg91.com/api/v5/flow/', {
        method: 'POST',
        headers: {
          authkey: authKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          template_id: templateId,
          short_url: '0',
          recipients: [{ mobiles: cleanPhone, message }]
        })
      });
      return res.ok;
    }
  } catch (err) {
    console.error('[Notifier:sms] Error sending SMS:', err.message);
  }
  return false;
}

/**
 * Channel 4: WhatsApp Cloud API
 * Official endpoint: https://graph.facebook.com/v20.0/{PHONE_NUMBER_ID}/messages
 */
async function sendWhatsappChannel({ phone, message }) {
  if (!phone) return false;
  const status = getChannelStatus().whatsapp;

  if (!status.enabled) {
    if (process.env.NODE_ENV !== 'production') {
      console.info(`[Notifier:whatsapp (dev-log)] To=${phone} | Text="${message}"`);
    }
    return false;
  }

  try {
    const token = process.env.WHATSAPP_ACCESS_TOKEN.trim();
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID.trim();
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const url = `https://graph.facebook.com/v20.0/${encodeURIComponent(phoneNumberId)}/messages`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: cleanPhone,
        type: 'text',
        text: { body: message }
      })
    });
    return res.ok;
  } catch (err) {
    console.error('[Notifier:whatsapp] Error sending WhatsApp message:', err.message);
    return false;
  }
}

/**
 * Unified notifyUser dispatcher
 * Always delivers in-app notification, plus email/sms/whatsapp according to user's notificationPreferences.
 */
async function notifyUser({
  userId,
  type = 'general',
  title,
  message,
  link = '',
  relatedDoc = null,
  emailSubject = null,
  emailHtml = null
}) {
  // 1. Always create in-app notification
  const inAppDoc = await sendInApp({ userId, type, title, message, link, relatedDoc });

  // 2. Look up user contact info and channel preferences
  try {
    const recipient = await User.findById(userId).select(
      'name email phone notificationPreferences'
    );
    if (!recipient) return inAppDoc;

    const prefs = recipient.notificationPreferences || {
      inapp: true,
      email: true,
      sms: false,
      whatsapp: false
    };

    const fullText = `[AgriConnect] ${title}: ${message}`;

    if (prefs.email !== false && recipient.email) {
      await sendEmailChannel({
        to: recipient.email,
        subject: emailSubject || `AgriConnect – ${title}`,
        html: emailHtml || `<p>Hi ${recipient.name},</p><p>${message}</p>`,
        text: fullText
      });
    }

    if (prefs.sms && recipient.phone) {
      await sendSmsChannel({ phone: recipient.phone, message: fullText });
    }

    if (prefs.whatsapp && recipient.phone) {
      await sendWhatsappChannel({ phone: recipient.phone, message: fullText });
    }
  } catch (err) {
    console.error('[Notifier] Channel dispatch error:', err.message);
  }

  return inAppDoc;
}

module.exports = {
  setSocketIO,
  getSocketIO,
  getChannelStatus,
  notifyUser,
  sendInApp,
  sendEmailChannel,
  sendSmsChannel,
  sendWhatsappChannel,
  emailTemplates
};

