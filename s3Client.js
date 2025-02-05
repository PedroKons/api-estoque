import { S3Client } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: 'auto',  // Para R2, use 'auto'
  endpoint: `https://${process.env.R2ACCOUNTID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2ACCESSKEY,
    secretAccessKey: process.env.R2SECRETACCESSKEY
  }
});

export default s3Client;