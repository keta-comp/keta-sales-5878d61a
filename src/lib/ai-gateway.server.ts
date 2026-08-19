import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function createLovableAiGatewayProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: { "Lovable-API-Key": apiKey },
  });
}

export function gatewayErrorMessage(error: unknown): string {
  const status = (error as { statusCode?: number; status?: number } | null)?.statusCode ??
    (error as { status?: number } | null)?.status;
  if (status === 402) return "AI credits exhausted. Add credits in Lovable to resume the AI agent.";
  if (status === 403) return "AI access is blocked by workspace policy.";
  if (status === 401) return "AI gateway key is missing or invalid.";
  if (status === 429) return "AI gateway is rate limited. Please retry shortly.";
  return error instanceof Error ? error.message : "Unknown AI gateway error";
}