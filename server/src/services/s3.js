const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({ region: process.env.AWS_REGION || 'ap-south-1' });

async function uploadBuffer(bucket, key, buffer, contentType = 'application/pdf', acl = 'private') {
  const cmd = new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: contentType, ACL: acl });
  await s3.send(cmd);
  return `s3://${bucket}/${key}`;
}

module.exports = { uploadBuffer };
