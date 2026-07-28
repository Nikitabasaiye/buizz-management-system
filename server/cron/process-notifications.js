const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { connectMySQL } = require('../src/database/mysql');
const notificationQueue = require('../src/services/notification-queue.service');

const run = async () => {
  await connectMySQL();
  const result = await notificationQueue.processPending({
    limit: Number(process.env.NOTIFICATION_CRON_BATCH_SIZE || 50),
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
};

run()
  .then(() => process.exit(0))
  .catch((error) => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exit(1);
  });
