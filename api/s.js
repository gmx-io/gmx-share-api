// API for creating the og image on the social media

function getImageUrl(query) {
  const folderName = "gmx"
  const baseUrl = "https://res.cloudinary.com/gmx/image/upload"
  return `${baseUrl}/${folderName}/${query.id}.jpeg`
}

export default function handler(req, res) {
  const { query } = req
  const imageUrl = getImageUrl(query)
  const rootRedirectURL = "https://gmx.io/#/";
  const referralParameter = query.ref ? `?ref=${query.ref}` : ''
  const html = `
    <!doctype html>
    <html lang="en">
    <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="title" content="GMX | Decentralized Perpetual Exchange" />
    <meta name="description" content="" />
    <meta property="og:locale" content="en_US" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:url" content="${imageUrl}" />
    <meta property="og:site_name" content="GMX" />
    <meta property="og:title" content="GMX | Decentralized Perpetual Exchange" />
    <meta property="og:description" content="" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:width" content="1024" />
    <meta property="og:image:height" content="512" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:description" content="Trade spot or perpetual BTC, ETH, AVAX and other top cryptocurrencies with up to 30x leverage directly from your wallet on Arbitrum and Avalanche." />
    <meta name="twitter:title" content="GMX | Decentralized Perpetual Exchange" />
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
          window.location.href = ${rootRedirectURL + referralParameter}
      }, 100);
    </script>
    </html>
  `

  res.statusCode = 200
  res.setHeader("Content-Type", "text/html")
  res.end(html)
}
