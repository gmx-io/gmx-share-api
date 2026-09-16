const allowedHosts = ["gmx.io", "www.gmx.io", "app.gmx.io"]
const previewHosts = ["gmx-interface.pages.dev", "gmx-interface-home.pages.dev"]

function isAllowedOrigin(origin) {
  if (typeof origin !== "string") return false

  try {
    const url = new URL(origin)
    if (url.protocol !== "https:" || url.port || url.origin !== origin) {
      return false
    }

    const hostname = url.hostname
    if (
      hostname.length > 253 ||
      !hostname
        .split(".")
        .every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))
    ) {
      return false
    }

    return (
      allowedHosts.includes(hostname) ||
      previewHosts.some(
        (host) => hostname === host || hostname.endsWith(`.${host}`),
      )
    )
  } catch {
    return false
  }
}

export default function allowCors(fn, allowAllOrigins = false) {
  return async (req, res) => {
    if (allowAllOrigins) {
      res.setHeader("Access-Control-Allow-Origin", "*")
    } else {
      const vary = String(res.getHeader("Vary") ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
      if (
        !vary.some((value) => value === "*" || value.toLowerCase() === "origin")
      ) {
        res.setHeader("Vary", [...vary, "Origin"].join(", "))
      }

      const origin = req.headers?.origin
      if (isAllowedOrigin(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin)
        res.setHeader("Access-Control-Allow-Credentials", true)
      }
    }

    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,OPTIONS,PATCH,DELETE,POST,PUT",
    )
    res.setHeader(
      "Access-Control-Allow-Headers",
      "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
    )
    if (req.method === "OPTIONS") {
      res.status(200).end()
      return
    }
    return await fn(req, res)
  }
}
