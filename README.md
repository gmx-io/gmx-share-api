# GMX Share

This repo provides image uploads and link previews for GMX trading and Rewards referral cards.

### Running Locally

Use Node.js 24, matching the deployed runtime and `.nvmrc`, and install dependencies with `yarn install`.

Copy the content of `.env.example` to `.env.local` using the following command:

```bash
cp .env.example .env.local
```

Update `.env.local` with the R2 settings, then run `yarn develop` with the Vercel CLI installed. Keep R2 credentials server-side and scope them to the share bucket.

### Share URL contract

The frontend uploads its rendered card as binary bytes to `POST /api/upload` with `Content-Type: application/octet-stream`. New images are stored in Cloudflare R2. The response retains the existing fields:

```json
{
  "image": "https://share-images.gmx.io/gmx/r20123456789abcdef0123456789abcdef.png",
  "version": 1794223560,
  "id": "r20123456789abcdef0123456789abcdef"
}
```

Use the returned `id` in a share URL:

```text
https://share.gmx.io/api/s?id=IMAGE_ID&ref=REFERRAL_CODE&page=rewards
```

| `page`                        | Browser destination                            |
| ----------------------------- | ---------------------------------------------- |
| Exact string `rewards`        | `https://gmx.io/rewards?ref=REFERRAL_CODE`     |
| Missing, unknown, or repeated | `https://app.gmx.io/#/trade?ref=REFERRAL_CODE` |

Existing `/api/s?id=IMAGE_ID&ref=REFERRAL_CODE` links retain their Trade destination and preview copy. Referral codes preserve casing; only letters, numbers, and underscores survive sanitization. Image IDs retain only letters and numbers. Repeated or non-string IDs and referral codes are treated as missing. An unusable referral code omits the destination's `?ref` parameter.

The initial HTML contains Open Graph and X metadata before the client-side redirect runs. A `<noscript>` link reaches the same destination. `og:url` identifies the share page using only usable `id`, usable `ref`, and recognized `page` parameters, with HTML-escaped query separators.

New IDs use `r2` followed by 32 lowercase hexadecimal characters. Their previews use `R2_PUBLIC_URL/gmx/IMAGE_ID.png` with `image/png`. Other IDs retain `https://res.cloudinary.com/gmx/image/upload/gmx/IMAGE_ID.jpg` with `image/jpeg`. Missing, empty, non-string, or fully sanitized-away IDs use the generic `https://gmx.io/og.png` asset with `image/png`. All cases keep the selected destination, referral code, and appropriate copy, including Rewards. Dimensions are omitted because uploaded cards can have different sizes.

Uploads accept static PNG, JPEG, and WebP images up to 2 MiB and 4,000,000 pixels. Images are decoded and re-encoded as PNG, removing metadata and trailing payloads; the stored PNG must also fit within 2 MiB. Invalid bytes return 400, unsupported formats return 415, oversized byte payloads return 413, and unsupported methods return 405. Storage or configuration failures return 503 without a share ID. `version` is the upload time in Unix seconds, not an R2 object version. Objects use random IDs and immutable cache headers.

### Upload CORS

Upload requests and preflights allow these HTTPS origins:

- `https://gmx.io`
- `https://www.gmx.io`
- `https://app.gmx.io`
- `https://gmx-interface.pages.dev` and its preview subdomains
- `https://gmx-interface-home.pages.dev` and its preview subdomains

Origins must be complete, serialized HTTPS origins without credentials, non-default ports, paths (including a trailing slash), query strings, or fragments. Preview hosts must match the exact hostname or a dot-delimited subdomain. Only approved origins receive a matching `Access-Control-Allow-Origin`; upload responses include `Vary: Origin`. Requests without `Origin` are handled safely. Share HTML remains public so crawlers can read it without an `Origin` header.

### Verification

Run `yarn test` (or `npm test`) on Node.js 24. The built-in Node test runner uses at most three workers and needs no live credentials. Tests cover uploads and their resulting share URLs, rejected files, storage failures, metadata, redirects, fallback images, query parameters, escaping, CORS origins, and preflights.

### R2 deployment

1. Create a dedicated R2 Standard bucket. Do not enable automatic expiration: existing share links must retain their images.
2. Connect a public custom domain such as `share-images.gmx.io` to the bucket in the same Cloudflare account as the domain's zone. Keep `r2.dev` disabled. Allow unauthenticated image GETs by social crawlers, with no login, hotlink restriction, or interactive challenge. Configure caching for PNGs.
3. Create an R2 Object Read & Write token restricted to this bucket. Add `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, and `R2_PUBLIC_URL` to the Vercel preview environment. `R2_PUBLIC_URL` must be an HTTPS origin, with no path, query, credentials, or fragment. Use a separate bucket and domain for preview uploads.
4. Before enabling uploads, configure a Vercel WAF rate limit on POST `/api/upload` across every project hostname, including deployment URLs. The production rule allows 100 requests per IP in a fixed 60-second window. A Cloudflare-only rule on `share.gmx.io` can be bypassed through Vercel deployment URLs unless those are separately protected. CORS is not upload authorization. Per-IP limits do not cap distributed abuse; monitor storage, writes, and 503s and keep an operational upload-block rule available.
5. Deploy a preview and upload a real Trade card and a Rewards card. Verify the returned image is publicly readable as `image/png`, both share pages contain the correct image URL, referral casing and destinations survive, and preflights work from the production and preview origins. Verify old IDs still select the legacy image source. Check oversized uploads and storage failures. Verify the WAF returns 429 for excess uploads without blocking OPTIONS or crawler GETs.
6. Add the production R2 settings and deploy this API before any frontend changes. No frontend change is required for the existing upload/share contract. Verify Copy link and Share on X on production and inspect a social preview.

R2 stores only new uploads until the legacy export is complete. To move historical images, first restore Cloudinary access and enumerate every public ID. Export the JPEG representation used by existing links, preserve each filename as `IMAGE_ID.jpg`, and verify counts and samples. Confirm no legacy ID matches the new `r2` + 32-hex format before cutover. Set `LEGACY_IMAGE_BASE_URL` to the HTTPS directory containing the exported JPEGs only after the export is complete. With that variable unset, old links continue using Cloudinary and remain broken while its cloud is disabled. Never silently route missing legacy objects to the new bucket.

For rollback, block new POST uploads in the firewall while keeping share pages and R2 image reads available. Reverting to code that predates R2 URL support breaks every newly issued R2 share link; retain the R2 reader and its environment settings when reverting upload changes. Keep the Cloudinary account and exports until historical links have been verified.

Setup references: [R2 custom domains](https://developers.cloudflare.com/r2/buckets/public-buckets/), [R2 S3 client](https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/), [Vercel WAF rate limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting).
