export const isElement = (v) => v && typeof v === "object" && v.nodeType === 1;
export const pad = (n, len = 2) => String(n).padStart(len, "0");
