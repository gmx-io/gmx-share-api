import assert from "node:assert/strict"
import test, { beforeEach } from "node:test"
import sharp from "sharp"
import { S3Client } from "@aws-sdk/client-s3"
import upload from "../api/upload.js"
import share from "../api/s.js"
import { createResponse } from "./helpers/response.js"

beforeEach((t) => {
  const original = { ...process.env }
  Object.assign(process.env, {
    R2_ACCOUNT_ID: "a".repeat(32),
    R2_ACCESS_KEY_ID: "test",
    R2_SECRET_ACCESS_KEY: "private-test-value",
    R2_BUCKET: "cards",
    R2_PUBLIC_URL: "https://images.example.com",
  })
  t.after(() => {
    process.env = original
  })
})

function fixture(width = 920, height = 480) {
  return sharp({
    create: { width, height, channels: 3, background: "#123456" },
  })
}

async function request(body, method = "POST") {
  const response = createResponse()
  await upload(
    { method, headers: { origin: "https://gmx.io" }, body },
    response,
  )
  return response
}

test("uploaded cards resolve to stored PNG bytes in Trade and Rewards previews", async (t) => {
  const objects = new Map()
  t.mock.method(S3Client.prototype, "send", async ({ input }) => {
    objects.set(input.Key, input)
  })
  for (const format of ["png", "jpeg", "webp"]) {
    const body = await fixture().toFormat(format).toBuffer()
    const response = await request(body)
    assert.equal(response.statusCode, 200)
    const result = JSON.parse(response.body)
    assert.match(result.id, /^r2[0-9a-f]{32}$/)
    const stored = objects.get(new URL(result.image).pathname.slice(1))
    assert.equal(stored.Bucket, "cards")
    assert.equal(stored.ContentType, "image/png")
    const decoded = await sharp(stored.Body)
      .raw()
      .toBuffer({ resolveWithObject: true })
    assert.equal(decoded.info.width, 920)
    assert.equal(decoded.info.height, 480)
    assert.ok(Math.abs(decoded.data[0] - 0x12) <= 3)
    for (const page of [undefined, "rewards"]) {
      const preview = createResponse()
      await share(
        { query: { id: result.id, page, ref: "MiXeD_Code" } },
        preview,
      )
      const image = preview.body.match(
        /property="og:image" content="([^"]+)"/,
      )[1]
      assert.equal(image, result.image)
      assert.match(
        preview.body,
        /property="og:image:type" content="image\/png"/,
      )
    }
  }
  assert.equal(objects.size, 3)
})

test("invalid and oversized uploads cannot persist objects", async (t) => {
  let stored = 0
  t.mock.method(S3Client.prototype, "send", async () => {
    stored++
  })
  const hugeImage = await fixture(2001, 2000).png().toBuffer()
  for (const [body, method, status] of [
    [Buffer.from("bad"), "GET", 405],
    [undefined, "POST", 400],
    [Buffer.alloc(0), "POST", 400],
    [{ image: "bad" }, "POST", 400],
    [Buffer.from("bad"), "POST", 400],
    [Buffer.alloc(2 * 1024 * 1024 + 1), "POST", 413],
    [hugeImage, "POST", 400],
    [
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>',
      ),
      "POST",
      415,
    ],
  ]) {
    const response = await request(body, method)
    assert.equal(response.statusCode, status)
    assert.equal(response.getHeader("Cache-Control"), "no-store")
  }
  assert.equal(stored, 0)
})

test("storage failures never return a usable share ID or disclose credentials", async (t) => {
  t.mock.method(console, "error", () => {})
  t.mock.method(S3Client.prototype, "send", async () => {
    throw new Error("private-test-value")
  })
  const body = await fixture().png().toBuffer()
  const response = await request(body)
  assert.equal(response.statusCode, 503)
  assert.equal(response.body, "Image storage unavailable")
})
