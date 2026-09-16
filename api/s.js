import allowCors from "../utils/allowCors.js"
import escapeHtml from "../utils/escapeHtml.js"
import { sanitizeId, sanitizeRef } from "../utils/sanitizeInput.js"

const SEO = {
  description:
    "Trade spot or perpetual BTC, ETH, AVAX and other top cryptocurrencies with up to 50x leverage directly from your wallet on Arbitrum and Avalanche.",
  title: "GMX | Decentralized Perpetual Exchange",
}

const REWARDS_SEO = {
  title: "GMX Season 1: Your perp trading fees come back to you",
  description:
    "Trade on GMX and a share of your fees comes back in esGMX and GT. Every 1x returns 12% of your fees. Staking, volume and boosts raise your multiplier.",
  shortDescription:
    "Your trading fees come back in esGMX and GT. Every 1x returns 12% of your fees.",
}

function handler(req, res) {
  const query = req.query ?? {}
  const id = sanitizeId(query.id)
  const ref = sanitizeRef(query.ref)
  const isRewards = query.page === "rewards"
  const seo = isRewards ? REWARDS_SEO : SEO
  const shortDescription = seo.shortDescription ?? seo.description
  const imageUrl = id
    ? `https://res.cloudinary.com/gmx/image/upload/gmx/${id}.jpg`
    : "https://gmx.io/og.png"
  const imageType = id ? "image/jpeg" : "image/png"
  const imageAlt = id
    ? isRewards
      ? "GMX Rewards referral card"
      : "GMX trading share card"
    : "GMX decentralized perpetual exchange"
  const shareUrl = new URL("https://share.gmx.io/api/s")
  if (id) shareUrl.searchParams.set("id", id)
  if (ref) shareUrl.searchParams.set("ref", ref)
  if (isRewards) shareUrl.searchParams.set("page", "rewards")

  const rootRedirectURL = isRewards
    ? "https://gmx.io/rewards"
    : "https://app.gmx.io/#/trade"
  const referralParameter = ref ? `?ref=${ref}` : ""
  const redirectUrl = rootRedirectURL + referralParameter
  const scriptRedirectUrl = JSON.stringify(redirectUrl).replace(/</g, "\\u003c")
  const html = `
    <!doctype html>
    <html lang="en">
    <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(seo.title)}</title>
    <meta name="title" content="${escapeHtml(seo.title)}" />
    <meta name="description" content="${escapeHtml(seo.description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="en_US" />
    <meta property="og:url" content="${escapeHtml(shareUrl.href)}" />
    <meta property="og:site_name" content="GMX" />
    <meta property="og:title" content="${escapeHtml(seo.title)}" />
    <meta property="og:description" content="${escapeHtml(shortDescription)}" />
    <meta property="og:image" content="${escapeHtml(imageUrl)}" />
    <meta property="og:image:type" content="${imageType}" />
    <meta property="og:image:alt" content="${escapeHtml(imageAlt)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@gmx_io" />
    <meta name="twitter:description" content="${escapeHtml(shortDescription)}" />
    <meta name="twitter:title" content="${escapeHtml(seo.title)}" />
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />
    <meta name="twitter:image:alt" content="${escapeHtml(imageAlt)}" />
    </head>
    <body>
    <noscript><a href="${escapeHtml(redirectUrl)}">Continue to GMX</a></noscript>
    <script>
      setTimeout(() => {
          window.location.href = ${scriptRedirectUrl}
      }, 100);
    </script>
    </body>
    </html>
  `
  res.statusCode = 200
  res.setHeader("Content-Type", "text/html; charset=utf-8")
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate")
  res.end(html)
}

export default allowCors(handler, true)
