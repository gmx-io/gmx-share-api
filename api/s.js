import allowCors from "../utils/allowCors"
import { sanitizeId, sanitizeRef } from "../utils/sanitizeInput"

const SEO = {
  description:
    "Trade spot or perpetual BTC, ETH, AVAX and other top cryptocurrencies with up to 50x leverage directly from your wallet on Arbitrum and Avalanche.",
  title: "GMX | Decentralized Perpetual Exchange",
}

function getImageUrl(query) {
  const id = sanitizeId(query.id)
  const folderName = "gmx"
  const baseUrl = "https://res.cloudinary.com/gmx/image/upload"
  return `${baseUrl}/${folderName}/${id}.jpg`
}

function handler(req, res) {
  const { query } = req
  const imageUrl = getImageUrl(query)
  const ref = sanitizeRef(query.ref)
  const rootRedirectURL = "https://app.gmx.io/#/trade"
  const referralParameter = ref ? `?ref=${ref}` : ""
  const html = `
    <!doctype html>
    <html lang="en">
    <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="title" content="${SEO.title}" />
    <meta name="description" content="${SEO.description}" />
    <meta property="og:locale" content="en_US" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:url" content="${imageUrl}" />
    <meta property="og:site_name" content="GMX" />
    <meta property="og:title" content="${SEO.title}" />
    <meta property="og:description" content="${SEO.description}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:width" content="1024" />
    <meta property="og:image:height" content="512" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:description" content="${SEO.description}" />
    <meta name="twitter:title" content="${SEO.title}" />
    <meta name="twitter:image" content="${imageUrl}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="140" />
    <meta property="og:image:height" content="140" />
    </head>
    <body>
    </body>
    <script>
      setTimeout(() => {
          window.location.href = "${rootRedirectURL + referralParameter}"
      }, 100);
    </script>
    </html>
  `
  res.statusCode = 200
  res.setHeader("Content-Type", "text/html")
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate")
  res.end(html)
}

export default allowCors(handler, true)
