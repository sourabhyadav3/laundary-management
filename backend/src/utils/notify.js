const Notification = require('../models/Notification');

/**
 * Creates a system notification
 * @param {string} title - Notification title
 * @param {string} text - Notification details
 * @param {string} type - 'order' | 'delivery' | 'system' | 'general'
 */
const notify = async (title, text, type = 'general') => {
  try {
    const notification = new Notification({
      title,
      text,
      type
    });
    await notification.save();
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
};

module.exports = notify;
