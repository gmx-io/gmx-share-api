export function sanatizeId(str) {
  return str.replace(/[^a-zA-Z0-9]/g, '');
};
export function sanatizeRef(str) {
  return str.replace(/[^A-Za-z0-9\_]/g, '');
};
