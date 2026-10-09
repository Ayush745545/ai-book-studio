import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { AiProvider } from "@/types";
function encryptionKey() {
  if (!process.env.NEXTAUTH_SECRET) throw new Error("Configure the account encryption secret before connecting AI.");
  return createHash("sha256").update(process.env.NEXTAUTH_SECRET).digest();
}
export function encryptApiKey(apiKey: string) {
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(apiKey, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map(part => part.toString("base64")).join(".");
}
export function decryptApiKey(value: string) {
  const [iv, tag, ciphertext] = value.split(".").map(part => Buffer.from(part, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv); decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
export async function writingCredentials(userId: string, provider: AiProvider = "openrouter") {
  if (provider === "openai") return { provider, apiKey: process.env.OPENAI_API_KEY };
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { openRouterKey: true } });
  const apiKey = user?.openRouterKey ? decryptApiKey(user.openRouterKey) : process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("Connect OpenRouter in AI preferences before generating a draft.");
  return { provider, apiKey };
}
