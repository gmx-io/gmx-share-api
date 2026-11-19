import sharp from "sharp"
import allowCors from "../utils/allowCors.js"
import { storeImage } from "../utils/imageStorage.js"

const MAX_IMAGE_BYTES = 2 * 1024 * 1024

async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store")
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS")
    return res.status(405).end("Method not allowed")
  }
  if (!Buffer.isBuffer(req.body) || !req.body.length) {
    return res.status(400).end("Expected image bytes")
  }
  if (req.body.length > MAX_IMAGE_BYTES) {
    return res.status(413).end("Image exceeds 2 MiB")
  }

  let image
  try {
    const decoder = sharp(req.body, {
      limitInputPixels: 4000000,
      failOn: "warning",
    })
    const metadata = await decoder.metadata()
    if (
      !["png", "jpeg", "webp"].includes(metadata.format) ||
      (metadata.pages || 1) !== 1
    ) {
      return res.status(415).end("Expected a static PNG, JPEG, or WebP image")
    }
    image = await decoder.png().toBuffer()
  } catch {
    return res.status(400).end("Invalid image")
  }
  if (image.length > MAX_IMAGE_BYTES) {
    return res.status(413).end("Image exceeds 2 MiB")
  }
  try {
    const imageInfo = await storeImage(image)
    res.setHeader("Content-Type", "application/json")
    res.status(200).end(JSON.stringify(imageInfo))
  } catch (error) {
    console.error("Share image storage failed", error.name)
    res.status(503).end("Image storage unavailable")
  }
}

export default allowCors(handler)
