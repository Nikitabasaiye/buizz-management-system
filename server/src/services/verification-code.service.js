const crypto = require('crypto');
const { getMySQLPool } = require('../database/mysql');
const { AppError } = require('../middleware/errorHandler');

const normalizeDestination = (channel, value) => {
  const text = String(value || '').trim();
  if (channel === 'email') return text.toLowerCase();
  const digits = text.replace(/\D/g, '');
  return digits.length === 10 ? `91${digits}` : digits;
};

const hashValue = (value) =>
  crypto
    .createHash('sha256')
    .update(`${String(value).toUpperCase()}:${process.env.JWT_SECRET || 'buizz'}`)
    .digest('hex');

const generateCode = () => {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '0123456789';
  const values = [
    ...Array.from({ length: 3 }, () => letters[crypto.randomInt(letters.length)]),
    ...Array.from({ length: 3 }, () => digits[crypto.randomInt(digits.length)]),
  ];

  for (let index = values.length - 1; index > 0; index -= 1) {
    const swapIndex = crypto.randomInt(index + 1);
    [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
  }
  return values.join('');
};

const create = async ({ channel, destination, purpose = 'signup', ttlMinutes = 10 }) => {
  const pool = getMySQLPool();
  const normalized = normalizeDestination(channel, destination);
  const code = generateCode();

  const [recentRows] = await pool.execute(
    `SELECT created_at
     FROM verification_codes
     WHERE channel = ? AND destination = ? AND purpose = ?
     ORDER BY id DESC
     LIMIT 1`,
    [channel, normalized, purpose],
  );
  if (recentRows[0] && Date.now() - new Date(recentRows[0].created_at).getTime() < 45_000) {
    throw new AppError('Please wait before requesting another OTP.', 429);
  }

  await pool.execute(
    `UPDATE verification_codes
     SET consumed_at = COALESCE(consumed_at, NOW())
     WHERE channel = ? AND destination = ? AND purpose = ? AND consumed_at IS NULL`,
    [channel, normalized, purpose],
  );
  await pool.execute(
    `INSERT INTO verification_codes
      (channel, destination, purpose, code_hash, expires_at)
     VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
    [channel, normalized, purpose, hashValue(code), ttlMinutes],
  );

  return { code, destination: normalized, expiresInSeconds: ttlMinutes * 60 };
};

const verify = async ({ channel, destination, purpose = 'signup', code }) => {
  const pool = getMySQLPool();
  const normalized = normalizeDestination(channel, destination);
  const [rows] = await pool.execute(
    `SELECT *
     FROM verification_codes
     WHERE channel = ? AND destination = ? AND purpose = ?
       AND consumed_at IS NULL
     ORDER BY id DESC
     LIMIT 1`,
    [channel, normalized, purpose],
  );
  const record = rows[0];

  if (!record || new Date(record.expires_at).getTime() <= Date.now()) {
    throw new AppError('OTP expired or not found. Please request a new one.', 400);
  }
  if (record.attempts >= 5) {
    throw new AppError('Too many incorrect attempts. Please request a new OTP.', 429);
  }
  if (record.code_hash !== hashValue(code)) {
    await pool.execute(
      'UPDATE verification_codes SET attempts = attempts + 1 WHERE id = ?',
      [record.id],
    );
    throw new AppError('Invalid OTP code.', 400);
  }

  const verificationToken = crypto.randomBytes(32).toString('hex');
  await pool.execute(
    `UPDATE verification_codes
     SET verified_at = NOW(), verification_token = ?
     WHERE id = ?`,
    [verificationToken, record.id],
  );
  return { verified: true, verificationToken, destination: normalized };
};

const consume = async ({ channel, destination, purpose = 'signup', verificationToken }) => {
  if (!verificationToken) {
    throw new AppError(`${channel === 'email' ? 'Email' : 'Phone'} verification is required`, 400);
  }

  const pool = getMySQLPool();
  const normalized = normalizeDestination(channel, destination);
  const [result] = await pool.execute(
    `UPDATE verification_codes
     SET consumed_at = NOW()
     WHERE channel = ? AND destination = ? AND purpose = ?
       AND verification_token = ? AND verified_at IS NOT NULL
       AND consumed_at IS NULL AND expires_at > NOW()`,
    [channel, normalized, purpose, verificationToken],
  );
  if (!result.affectedRows) {
    throw new AppError(`Invalid or expired ${channel} verification`, 400);
  }
  return true;
};

const consumeMany = async (verifications) => {
  const pool = getMySQLPool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    for (const verification of verifications) {
      const { channel, destination, purpose = 'signup', verificationToken } = verification;
      if (!verificationToken) {
        throw new AppError(`${channel === 'email' ? 'Email' : 'Phone'} verification is required`, 400);
      }
      const [result] = await connection.execute(
        `UPDATE verification_codes
         SET consumed_at = NOW()
         WHERE channel = ? AND destination = ? AND purpose = ?
           AND verification_token = ? AND verified_at IS NOT NULL
           AND consumed_at IS NULL AND expires_at > NOW()`,
        [channel, normalizeDestination(channel, destination), purpose, verificationToken],
      );
      if (!result.affectedRows) {
        throw new AppError(`Invalid or expired ${channel} verification`, 400);
      }
    }
    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  generateCode,
  normalizeDestination,
  create,
  verify,
  consume,
  consumeMany,
};
