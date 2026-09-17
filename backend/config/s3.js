import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3'

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
})

export async function uploadToS3(fileBuffer, fileName, mimeType) {
  const bucketName =
    process.env.AWS_S3_BUCKET_NAME ||
    process.env.AWS_S3_BUCKET ||
    'nst-evidence-uploads'
  const key = `evidence/${Date.now()}_${fileName.replace(/\s+/g, '_')}`

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType,
  })

  await s3Client.send(command)
  const region = process.env.AWS_REGION || 'us-east-1'
  return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`
}

export async function downloadFromS3(key) {
  const bucketName =
    process.env.AWS_S3_BUCKET_NAME ||
    process.env.AWS_S3_BUCKET ||
    'nst-evidence-uploads'

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  })

  return await s3Client.send(command)
}

export default s3Client
