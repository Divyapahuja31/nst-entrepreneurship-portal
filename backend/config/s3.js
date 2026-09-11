import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
})

/**
 * Upload a file buffer to S3 bucket
 * @param {Buffer} fileBuffer
 * @param {string} fileName
 * @param {string} mimeType
 * @returns {Promise<string>} S3 object URL
 */

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

export default s3Client
