import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { resolveTokenForServer, tokenVaultRequest } from "@/lib/token-vault";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  credentialId: z.string().uuid(),
  model: z.string().trim().min(1).max(120),
  messages: z.array(z.object({
    role: z.enum(["system", "user", "assistant"]),
    content: z.string().max(20_000)
  })).min(1).max(40),
  maxTokens: z.number().int().min(1).max(4096).default(1024)
});

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" }
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return json({ error: "Unauthorized" }, 401);

  let raw: unknown;
  try { raw = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) return json({ error: "Invalid chat request" }, 400);

  try {
    const listed = await tokenVaultRequest<{ tokens: Array<{ id: string; provider: string }> }>(
      { id: session.user.id }, "/api/service/tokens"
    );
    const credential = (listed.tokens ?? []).find((item) => item.id === parsed.data.credentialId);
    if (!credential) return json({ error: "Credential not found" }, 404);
    if (credential.provider === "custom") return json({ error: "Custom provider proxy is not enabled" }, 400);

    const apiKey = await resolveTokenForServer({ id: session.user.id }, credential.id);
    const { model, messages, maxTokens } = parsed.data;
    let endpoint: string;
    let headers: Record<string, string>;
    let body: unknown;

    if (credential.provider === "openai") {
      endpoint = "https://api.openai.com/v1/chat/completions";
      headers = { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" };
      body = { model, messages, max_tokens: maxTokens, stream: false };
    } else if (credential.provider === "anthropic") {
      endpoint = "https://api.anthropic.com/v1/messages";
      const system = messages.filter((item) => item.role === "system").map((item) => item.content).join("\n\n");
      headers = { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" };
      body = {
        model, max_tokens: maxTokens,
        ...(system ? { system } : {}),
        messages: messages.filter((item) => item.role !== "system").map((item) => ({ role: item.role, content: item.content }))
      };
    } else {
      endpoint = "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent";
      const system = messages.filter((item) => item.role === "system").map((item) => item.content).join("\n\n");
      headers = { "x-goog-api-key": apiKey, "Content-Type": "application/json" };
      body = {
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        contents: messages.filter((item) => item.role !== "system").map((item) => ({
          role: item.role === "assistant" ? "model" : "user",
          parts: [{ text: item.content }]
        })),
        generationConfig: { maxOutputTokens: maxTokens }
      };
    }

    const upstream = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(45_000)
    });
    if (!upstream.ok) return json({ error: "Provider request failed", provider: credential.provider, status: upstream.status }, 502);
    const result = await upstream.json() as Record<string, unknown>;
    return json({ provider: credential.provider, model, result });
  } catch {
    return json({ error: "Secure provider request failed" }, 502);
  }
}
