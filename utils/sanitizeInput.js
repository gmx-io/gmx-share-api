export function sanitizeId(str = "") {
  return typeof str === "string" ? str.replace(/[^a-zA-Z0-9]/g, "") : ""
}
export function sanitizeRef(str = "") {
  return typeof str === "string" ? str.replace(/[^A-Za-z0-9_]/g, "") : ""
}
