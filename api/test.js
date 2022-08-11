import allowCors from "../utils/allowCors"

async function handler(_req, res) {
  res.json({
    user: "Hello World!"
  })
}

export default allowCors(handler)
