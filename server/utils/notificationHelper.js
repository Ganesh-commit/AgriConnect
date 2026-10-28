/**
 * Notification helper — delegates to the pluggable Notifier service
 * while preserving backward compatibility with existing controllers.
 */
const notifier = require('../services/notifier');

const setSocketIO = (io) => {
  notifier.setSocketIO(io);
};

const createNotification = async ({
  userId,
  type,
  title,
  message,
  link = '',
  relatedDoc = null,
  emailSubject = null,
  emailHtml = null
}) => {
  return notifier.notifyUser({
    userId,
    type,
    title,
    message,
    link,
    relatedDoc,
    emailSubject,
    emailHtml
  });
};

module.exports = {
  setSocketIO,
  createNotification,
  notifier
};
