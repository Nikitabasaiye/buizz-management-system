const { getMySQLPool } = require('../../database/mysql');
const logger = require('../../utils/logger');

const saveSignup = async (email) => {
  const pool = getMySQLPool();

  if (!pool) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('MySQL is not connected.');
    }

    logger.warn(`Waitlist signup skipped because MySQL is not connected: ${email}`);
    return { skipped: true };
  }

  await pool.execute(
    `
      INSERT INTO launch_waitlist (email)
      VALUES (?)
      ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP
    `,
    [email.toLowerCase()]
  );

  return { skipped: false };
};

module.exports = {
  saveSignup
};
