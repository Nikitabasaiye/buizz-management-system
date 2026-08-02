const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const cloudinaryConfig = require('../src/config/cloudinary');

const run = async () => {
  if (!cloudinaryConfig.isConfigured()) {
    throw new Error('Cloudinary credentials are missing');
  }

  await cloudinaryConfig.verifyConnection();
  const configuration = cloudinaryConfig.cloudinary.config();
  process.stdout.write(`Cloudinary connection verified for cloud ${configuration.cloud_name}\n`);

  if (!process.argv.includes('--write-test')) return;

  const publicId = `buizz/deployment-tests/verification-${Date.now()}`;
  const transparentPixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  const uploaded = await cloudinaryConfig.cloudinary.uploader.upload(transparentPixel, {
    public_id: publicId,
    resource_type: 'image',
    type: 'authenticated',
    overwrite: false,
  });

  try {
    if (!uploaded.asset_id || !uploaded.public_id) {
      throw new Error('Cloudinary write verification returned an incomplete response');
    }
    process.stdout.write('Cloudinary authenticated upload verified\n');
  } finally {
    await cloudinaryConfig.cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
      type: 'authenticated',
      invalidate: true,
    });
  }
  process.stdout.write('Cloudinary delete permission verified\n');
};

run().catch((error) => {
  process.stderr.write(`Cloudinary verification failed: ${error.message}\n`);
  process.exit(1);
});
