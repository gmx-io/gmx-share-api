import assert from "node:assert/strict"
import test from "node:test"
import { runInNewContext } from "node:vm"
import share from "../api/s.js"
import { createResponse } from "./helpers/response.js"

const TRADE = {
  title: "GMX | Decentralized Perpetual Exchange",
  description:
    "Trade spot or perpetual BTC, ETH, AVAX and other top cryptocurrencies with up to 50x leverage directly from your wallet on Arbitrum and Avalanche.",
}
const REWARDS = {
  title: "GMX Season 1: Your perp trading fees come back to you",
  description:
    "Trade on GMX and a share of your fees comes back in esGMX and GT. Every 1x returns 12% of your fees. Staking, volume and boosts raise your multiplier.",
  shortDescription:
    "Your trading fees come back in esGMX and GT. Every 1x returns 12% of your fees.",
}
const FALLBACK_IMAGE = "https://gmx.io/og.png"
const UPLOADED_IMAGE =
  "https://res.cloudinary.com/gmx/image/upload/gmx/Card42.jpg"

async function renderShare(query, headers = {}) {
  const response = createResponse()
  await share({ method: "GET", headers, query }, response)
  return response
}

function assertPage(
  response,
  {
    rewards = false,
    imageUrl = FALLBACK_IMAGE,
    imageType = "image/png",
    imageAlt = "GMX decentralized perpetual exchange",
    canonicalUrl,
    redirectUrl,
  },
) {
  assert.equal(response.statusCode, 200)
  assert.equal(response.ended, true)
  assert.equal(response.getHeader("Content-Type"), "text/html; charset=utf-8")
  assert.equal(response.getHeader("Access-Control-Allow-Origin"), "*")
  assert.equal(
    response.getHeader("Access-Control-Allow-Credentials"),
    undefined,
  )

  const html = response.body
  const head = html.match(/<head>([\s\S]*?)<\/head>/)?.[1]
  assert.ok(head, "Metadata must be present in the initial HTML head")
  assert.ok(html.indexOf("</head>") < html.indexOf("<script>"))
  const metadata = new Map()
  for (const [tag] of head.matchAll(/<meta\b[^>]*>/g)) {
    const name = tag.match(/(?:name|property)="([^"]+)"/)?.[1]
    if (!name) continue
    assert.equal(metadata.has(name), false, `Duplicate metadata: ${name}`)
    metadata.set(name, tag.match(/content="([^"]*)"/)?.[1])
  }

  const seo = rewards ? REWARDS : TRADE
  assert.equal(head.match(/<title>(.*?)<\/title>/)?.[1], seo.title)
  const expected = {
    title: seo.title,
    description: seo.description,
    "og:type": "website",
    "og:site_name": "GMX",
    "og:title": seo.title,
    "og:description": seo.shortDescription ?? seo.description,
    "og:url": canonicalUrl,
    "og:image": imageUrl,
    "og:image:type": imageType,
    "og:image:alt": imageAlt,
    "twitter:card": "summary_large_image",
    "twitter:site": "@gmx_io",
    "twitter:title": seo.title,
    "twitter:description": seo.shortDescription ?? seo.description,
    "twitter:image": imageUrl,
    "twitter:image:alt": imageAlt,
  }
  for (const [name, value] of Object.entries(expected)) {
    assert.equal(metadata.get(name), value, name)
  }
  assert.doesNotMatch(html, /(?:og|twitter):image:(?:width|height)/)
  assert.doesNotMatch(html, /\/gmx\/\.jpg/)

  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
  assert.equal(scripts.length, 1)
  const window = { location: { href: "" } }
  let scheduled = false
  runInNewContext(scripts[0][1], {
    window,
    setTimeout(callback, delay) {
      scheduled = true
      assert.equal(delay, 100)
      callback()
    },
  })
  assert.equal(scheduled, true)
  assert.equal(window.location.href, redirectUrl)
  assert.equal(html.match(/<noscript>\s*<a href="([^"]+)"/)?.[1], redirectUrl)
}

test("Rewards image links expose the approved copy and referral in raw HTML", async () => {
  const response = await renderShare({
    id: "Card42",
    ref: "MiXeD_Code",
    page: "rewards",
  })
  assertPage(response, {
    rewards: true,
    imageUrl: UPLOADED_IMAGE,
    imageType: "image/jpeg",
    imageAlt: "GMX Rewards referral card",
    canonicalUrl:
      "https://share.gmx.io/api/s?id=Card42&amp;ref=MiXeD_Code&amp;page=rewards",
    redirectUrl: "https://gmx.io/rewards?ref=MiXeD_Code",
  })
})

test("existing image links and unknown or ambiguous pages retain Trade behavior", async () => {
  for (const page of [
    undefined,
    "unknown",
    "Rewards",
    "rewards ",
    ["rewards"],
    ["rewards", "rewards"],
    ["rewards", "trade"],
    { value: "rewards" },
    42,
    null,
  ]) {
    const response = await renderShare({
      id: "Card42",
      ref: "MiXeD_Code",
      page,
    })
    assertPage(response, {
      imageUrl: UPLOADED_IMAGE,
      imageType: "image/jpeg",
      imageAlt: "GMX trading share card",
      canonicalUrl: "https://share.gmx.io/api/s?id=Card42&amp;ref=MiXeD_Code",
      redirectUrl: "https://app.gmx.io/#/trade?ref=MiXeD_Code",
    })
  }
})

for (const rewards of [false, true]) {
  const page = rewards ? "rewards" : undefined
  const destination = rewards
    ? "https://gmx.io/rewards"
    : "https://app.gmx.io/#/trade"

  test(`${rewards ? "Rewards" : "Trade"} uses the PNG fallback for every unusable ID`, async () => {
    for (const id of [
      undefined,
      "",
      null,
      [],
      ["Card42"],
      ["A", "B"],
      {},
      42,
      true,
      "_-/<>?\"'& \n",
    ]) {
      assertPage(await renderShare({ id, page, ref: "MiXeD_Code" }), {
        rewards,
        canonicalUrl: rewards
          ? "https://share.gmx.io/api/s?ref=MiXeD_Code&amp;page=rewards"
          : "https://share.gmx.io/api/s?ref=MiXeD_Code",
        redirectUrl: `${destination}?ref=MiXeD_Code`,
      })
    }
  })

  test(`${rewards ? "Rewards" : "Trade"} omits unusable referral parameters with and without images`, async () => {
    for (const ref of [
      undefined,
      "",
      null,
      [],
      ["Referral"],
      ["A", "B"],
      {},
      42,
      true,
      "-/<>?\"'& \n",
    ]) {
      for (const id of [undefined, "Card42"]) {
        assertPage(await renderShare({ id, ref, page }), {
          rewards,
          ...(id
            ? {
                imageUrl: UPLOADED_IMAGE,
                imageType: "image/jpeg",
                imageAlt: rewards
                  ? "GMX Rewards referral card"
                  : "GMX trading share card",
              }
            : {}),
          canonicalUrl: id
            ? rewards
              ? "https://share.gmx.io/api/s?id=Card42&amp;page=rewards"
              : "https://share.gmx.io/api/s?id=Card42"
            : rewards
              ? "https://share.gmx.io/api/s?page=rewards"
              : "https://share.gmx.io/api/s",
          redirectUrl: destination,
        })
      }
    }
  })
}

test("an absent query object still returns a complete Trade preview", async () => {
  for (const query of [undefined, null, {}]) {
    assertPage(await renderShare(query), {
      canonicalUrl: "https://share.gmx.io/api/s",
      redirectUrl: "https://app.gmx.io/#/trade",
    })
  }
})

test("query payloads are sanitized without changing fixed destinations or injecting markup", async () => {
  const response = await renderShare({
    id: '../Ca-rd_42"&<>',
    ref: 'MiXeD_Code\"><script>alert(1)</script>',
    page: "https://evil.example/rewards",
    url: "https://evil.example",
  })
  assertPage(response, {
    imageUrl: UPLOADED_IMAGE,
    imageType: "image/jpeg",
    imageAlt: "GMX trading share card",
    canonicalUrl:
      "https://share.gmx.io/api/s?id=Card42&amp;ref=MiXeD_Codescriptalert1script",
    redirectUrl: "https://app.gmx.io/#/trade?ref=MiXeD_Codescriptalert1script",
  })
  assert.doesNotMatch(response.body, /evil\.example|<script>alert|\.\.\//)
  assert.doesNotMatch(response.body, /&(?:ref|page)=/)
})

test("crawler metadata is public even with an unrelated Origin", async () => {
  assertPage(
    await renderShare(
      { page: "rewards" },
      { origin: "https://crawler.example" },
    ),
    {
      rewards: true,
      canonicalUrl: "https://share.gmx.io/api/s?page=rewards",
      redirectUrl: "https://gmx.io/rewards",
    },
  )
})
