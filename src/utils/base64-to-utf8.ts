export const base64ToUtf8 = (base64: string) =>
  Buffer.from(base64, "base64").toString("utf-8");
