export function createResponse(headers = {}) {
  const responseHeaders = new Map(
    Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value]),
  )

  return {
    statusCode: 200,
    body: undefined,
    ended: false,
    getHeader(name) {
      return responseHeaders.get(name.toLowerCase())
    },
    setHeader(name, value) {
      responseHeaders.set(name.toLowerCase(), value)
    },
    status(code) {
      this.statusCode = code
      return this
    },
    end(body) {
      this.body = body
      this.ended = true
      return this
    },
  }
}
