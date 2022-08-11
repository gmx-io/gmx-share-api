export function sanitizeId(str) {
  return str.replace(/[^a-zA-Z0-9]/g, "")
}
export function sanitizeRef(str) {
  return str.replace(/[^A-Za-z0-9\_]/g, "")
}
