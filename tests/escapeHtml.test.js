import assert from "node:assert/strict"
import test from "node:test"
import escapeHtml from "../utils/escapeHtml.js"

test("HTML text and attribute delimiters are escaped throughout the value", () => {
  assert.equal(
    escapeHtml(`GMX & GMX <img alt="Rewards' card"> & <script>`),
    "GMX &amp; GMX &lt;img alt=&quot;Rewards&#39; card&quot;&gt; &amp; &lt;script&gt;",
  )
})
