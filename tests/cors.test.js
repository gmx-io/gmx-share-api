import assert from "node:assert/strict"
import test from "node:test"
import allowCors from "../utils/allowCors.js"
import { createResponse } from "./helpers/response.js"

const ALLOWED_ORIGINS = [
  "https://gmx.io",
  "https://www.gmx.io",
  "https://app.gmx.io",
  "https://gmx-interface.pages.dev",
  "https://feature-123.gmx-interface.pages.dev",
  "https://preview.branch.gmx-interface.pages.dev",
  "https://gmx-interface-home.pages.dev",
  "https://a1b2c3.gmx-interface-home.pages.dev",
  "https://preview.branch.gmx-interface-home.pages.dev",
]

async function requestCors({
  origin,
  method = "POST",
  headers = {},
  publicAccess = false,
} = {}) {
  const response = createResponse(headers)
  let called = false
  const handler = allowCors((req, res) => {
    called = true
    res.status(201).end("uploaded")
  }, publicAccess)
  await handler({ method, headers: { origin } }, response)
  return { response, called }
}

test("upload CORS echoes approved production and preview origins", async () => {
  for (const origin of ALLOWED_ORIGINS) {
    const { response, called } = await requestCors({ origin })
    assert.equal(called, true, origin)
    assert.equal(response.statusCode, 201)
    assert.equal(response.getHeader("Access-Control-Allow-Origin"), origin)
    assert.equal(response.getHeader("Access-Control-Allow-Credentials"), true)
    assert.equal(response.getHeader("Vary"), "Origin")
  }
})

test("upload preflights allow POST and Content-Type without invoking the upload", async () => {
  for (const origin of ALLOWED_ORIGINS) {
    const { response, called } = await requestCors({
      origin,
      method: "OPTIONS",
    })
    assert.equal(called, false, origin)
    assert.equal(response.statusCode, 200)
    assert.equal(response.ended, true)
    assert.equal(response.getHeader("Access-Control-Allow-Origin"), origin)
    assert.match(response.getHeader("Access-Control-Allow-Methods"), /\bPOST\b/)
    assert.match(
      response.getHeader("Access-Control-Allow-Headers"),
      /\bContent-Type\b/,
    )
    assert.equal(response.getHeader("Vary"), "Origin")
  }
})

test("upload CORS rejects lookalikes, unapproved origins and malformed values", async () => {
  for (const origin of [
    "https://evil.example",
    "http://gmx.io",
    "http://app.gmx.io",
    "http://preview.gmx-interface.pages.dev",
    "https://gmx.io.evil.example",
    "https://www.gmx.io.evil.example",
    "https://app.gmx.io.evil.example",
    "https://evilapp.gmx.io",
    "https://preview.gmx.io",
    "https://gmx-interface.pages.dev.evil.example",
    "https://evilgmx-interface.pages.dev",
    "https://evilgmx-interface-home.pages.dev",
    "https://gmx-interface-home.pages.dev.evil.example",
    "https://preview..gmx-interface.pages.dev",
    "https://.gmx-interface.pages.dev",
    "https://-preview.gmx-interface-home.pages.dev",
    "https://preview_.gmx-interface.pages.dev",
    `https://${"a".repeat(64)}.gmx-interface.pages.dev`,
    "https://gmx.io/",
    "https://gmx.io/path",
    "https://gmx.io?query=1",
    "https://gmx.io?",
    "https://gmx.io#fragment",
    "https://gmx.io#",
    "https://gmx.io:8443",
    "https://preview.gmx-interface.pages.dev:8443",
    "https://user:password@gmx.io",
    "https://gmx.io@evil.example",
    "https://evil.example@gmx.io",
    "https://gmx.io\\evil.example",
    "https://%67mx.io",
    "https:gmx.io",
    "https:///gmx.io",
    " https://gmx.io",
    "https://gmx.io\n",
    "https://gmx.io, https://app.gmx.io",
    "null",
    "not a URL",
    "",
    undefined,
    null,
    42,
    ["https://gmx.io"],
    { origin: "https://gmx.io" },
  ]) {
    for (const method of ["POST", "OPTIONS"]) {
      const { response } = await requestCors({ origin, method })
      assert.equal(
        response.getHeader("Access-Control-Allow-Origin"),
        undefined,
        String(origin),
      )
      assert.equal(
        response.getHeader("Access-Control-Allow-Credentials"),
        undefined,
      )
      assert.equal(response.getHeader("Vary"), "Origin")
      assert.equal(response.ended, true)
    }
  }
})

test("a missing headers object is handled safely", async () => {
  const response = createResponse()
  await allowCors((req, res) => res.end("ok"))({ method: "POST" }, response)
  assert.equal(response.body, "ok")
  assert.equal(response.getHeader("Access-Control-Allow-Origin"), undefined)
  assert.equal(response.getHeader("Vary"), "Origin")
})

test("Vary preserves existing fields and avoids duplicate Origin values", async () => {
  for (const [existing, expected] of [
    ["Accept-Encoding", "Accept-Encoding, Origin"],
    [["Accept-Encoding", "Accept"], "Accept-Encoding, Accept, Origin"],
    ["origin", "origin"],
    ["Accept-Encoding, ORIGIN", "Accept-Encoding, ORIGIN"],
    ["*", "*"],
  ]) {
    const { response } = await requestCors({
      origin: "https://gmx.io",
      headers: { Vary: existing },
    })
    assert.equal(response.getHeader("Vary"), expected)
  }
})

test("public endpoints remain readable without credentialed CORS", async () => {
  for (const origin of [undefined, "https://crawler.example"]) {
    const { response, called } = await requestCors({
      origin,
      publicAccess: true,
    })
    assert.equal(called, true)
    assert.equal(response.getHeader("Access-Control-Allow-Origin"), "*")
    assert.equal(
      response.getHeader("Access-Control-Allow-Credentials"),
      undefined,
    )
    assert.equal(response.getHeader("Vary"), undefined)
  }
})
