import { randomBytes } from "node:crypto"
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3"

export function isR2Image(id) {
  return /^r2[0-9a-f]{32}$/.test(id)
}

export function getImageUrl(id) {
  if (!isR2Image(id)) {
    const base =
      process.env.LEGACY_IMAGE_BASE_URL ||
      "https://res.cloudinary.com/gmx/image/upload/gmx"
    return `${base.replace(/\/$/, "")}/${id}.jpg`
  }

  const base = new URL(process.env.R2_PUBLIC_URL)
  if (
    base.protocol !== "https:" ||
    base.username ||
    base.password ||
    base.search ||
    base.hash ||
    base.pathname !== "/"
  ) {
    throw new Error("Invalid R2_PUBLIC_URL")
  }
  return `${base.origin}/gmx/${id}.png`
}

export async function storeImage(image) {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } =
    process.env
  if (
    !/^[a-f0-9]{32}$/.test(R2_ACCOUNT_ID || "") ||
    !R2_ACCESS_KEY_ID ||
    !R2_SECRET_ACCESS_KEY ||
    !R2_BUCKET
  ) {
    throw new Error("Missing R2 configuration")
  }

  const id = `r2${randomBytes(16).toString("hex")}`
  const url = getImageUrl(id)
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
    maxAttempts: 2,
  })
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: `gmx/${id}.png`,
        Body: image,
        ContentType: "image/png",
        CacheControl: "public, max-age=31536000, immutable",
      }),
      { abortSignal: AbortSignal.timeout(10000) },
    )
  } finally {
    client.destroy()
  }
  return { image: url, version: Math.floor(Date.now() / 1000), id }
}
