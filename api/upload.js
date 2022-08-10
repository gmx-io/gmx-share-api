import allowCors from "../utils/allowCors"

const cloudinary = require("cloudinary").v2

cloudinary.config({
  cloud_name: "gmx",
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET
})

function uploadScreenshot(screenshot) {
  return new Promise((resolve, reject) => {
    const uploadOptions = { folder: "gmx" }
    cloudinary.uploader
      .upload_stream(uploadOptions, (error, result) => {
        if (error) reject(error)
        else resolve(result)
      })
      .end(screenshot)
  })
}

async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(200).send("ok")
  }
  try {
    let imageInfo = await uploadScreenshot(req.body)
    res.statusCode = 200
    res.json({
      image: imageInfo.url,
      version: imageInfo.version,
      id: imageInfo.public_id.split("/")[1]
    })
  } catch (error) {
    res.statusCode = 500
    res.setHeader("Content-Type", "text/html")
    res.end("<h1>Internal Error</h1><p>Sorry, there was a problem</p>")
    console.error(error)
  }
}

export default allowCors(handler)
