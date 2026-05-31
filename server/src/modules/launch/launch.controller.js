const { sendEmail } = require('../../utils/email');
const { AppError } = require('../../middleware/errorHandler');
const launchRepository = require('./launch.repository');
const logger = require('../../utils/logger');

const notify = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new AppError('A valid email address is required', 400);
    }

    const senderAddress = 'Buizz <contact@buizz.com>';
    const receiverAddress = email;
    const adminAddress = process.env.SMTP_USER || 'contact@buizz.com';

    await launchRepository.saveSignup(email);

    let emailDelivered = true;

    try {
      await sendEmail({
        from: senderAddress,
        to: receiverAddress,
        subject: 'Thanks for joining Buizz launch updates',
        text: `Thanks for subscribing to Buizz launch updates. We will notify you at ${email} once the product is ready.`,
        html: `<p>Thanks for subscribing to <strong>Buizz</strong> launch updates.</p><p>We will notify you at <strong>${email}</strong> once the product is ready.</p>`
      });

      await sendEmail({
        from: senderAddress,
        to: adminAddress,
        subject: 'New Buizz launch notification signup',
        text: `A new user has subscribed for Buizz launch updates: ${email}`,
        html: `<p>A new user has subscribed for <strong>Buizz</strong> launch updates:</p><p><strong>${email}</strong></p>`
      });
    } catch (error) {
      emailDelivered = false;
      logger.error(`Waitlist email delivery failed for ${email}: ${error.message}`);
    }

    res.status(200).json({
      status: 'success',
      message: emailDelivered
        ? 'You are subscribed! A confirmation email is on its way.'
        : 'You are subscribed! Confirmation email will be sent once mail settings are fixed.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { notify };
