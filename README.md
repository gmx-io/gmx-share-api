# GMX Share

This repo provides image uploads and link previews for GMX trading and Rewards referral cards.

### Running Locally

Use Node.js 24, matching the deployed runtime and `.nvmrc`, and install dependencies with `yarn install`.

Copy the content of `.env.example` to `.env.local` using the following command:

```bash
cp .env.example .env.local
```

Update `.env.local` with the Cloudinary API key and secret, then run `yarn develop` with the Vercel CLI installed.

### Share URL contract

The frontend uploads its rendered card to `POST /api/upload`. Cloudinary storage and the upload response remain the same:

```json
{
  "image": "https://res.cloudinary.com/gmx/image/upload/v123/gmx/IMAGE_ID.jpg",
  "version": 123,
  "id": "IMAGE_ID"
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

Uploaded previews use `https://res.cloudinary.com/gmx/image/upload/gmx/IMAGE_ID.jpg` for both image tags with `image/jpeg`. Missing, empty, non-string, or fully sanitized-away IDs use the generic `https://gmx.io/og.png` asset with `image/png`. Both cases keep the selected destination, referral code, and appropriate copy, including the approved Rewards title and full/short descriptions when `page=rewards`. Image alt text describes the selected card or generic GMX image. Dimensions are omitted because uploaded cards can have different sizes.

### Upload CORS

Upload requests and preflights allow these HTTPS origins:

- `https://gmx.io`
- `https://www.gmx.io`
- `https://app.gmx.io`
- `https://gmx-interface.pages.dev` and its preview subdomains
- `https://gmx-interface-home.pages.dev` and its preview subdomains

Origins must be complete, serialized HTTPS origins without credentials, non-default ports, paths (including a trailing slash), query strings, or fragments. Preview hosts must match the exact hostname or a dot-delimited subdomain. Only approved origins receive a matching `Access-Control-Allow-Origin`; upload responses include `Vary: Origin`. Requests without `Origin` are handled safely. Share HTML remains public so crawlers can read it without an `Origin` header.

### Verification

Run `yarn test` (or `npm test`) on Node.js 24. The built-in Node test runner uses at most three workers and needs no Cloudinary credentials. Tests cover raw HTML metadata, redirects, fallback images, malformed/repeated query parameters, escaping, CORS origins, and preflights.

### Deployment order

Deploy this Share API support **before** publishing the corresponding Rewards frontend changes in `gmx-io/gmx-interface` PR #2860 (FEDEV-4028). The frontend expects the existing upload response to contain `id` and uses `page=rewards` for both **Copy link** and **Share on X**.
