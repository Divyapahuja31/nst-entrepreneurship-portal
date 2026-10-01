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

const EVIDENCE_PREFIX = 'evidence/'

const getBucketName = () =>
  process.env.AWS_S3_BUCKET_NAME ||
  process.env.AWS_S3_BUCKET ||
  'nst-evidence-uploads'

// The S3 key of an evidence file we uploaded, or null for any other URL, so a
// stored URL can't make us fetch another object or another host.
export const evidenceKeyFromUrl = fileUrl => {
  let url, key
  try {
    url = new URL(fileUrl)
    key = decodeURIComponent(url.pathname.slice(1))
  } catch {
    return null
  }
  const bucketName = getBucketName()
  const isOurBucket =
    url.protocol === 'https:' &&
    url.hostname.startsWith(`${bucketName}.s3.`) &&
    url.hostname.endsWith('.amazonaws.com')
  return isOurBucket && key.startsWith(EVIDENCE_PREFIX) ? key : null
}

export async function uploadToS3(fileBuffer, fileName, mimeType) {
  const bucketName = getBucketName()
  const key = `${EVIDENCE_PREFIX}${Date.now()}_${fileName.replace(/\s+/g, '_')}`

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
  const bucketName = getBucketName()

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  })

  return await s3Client.send(command)
}

export default s3Client
