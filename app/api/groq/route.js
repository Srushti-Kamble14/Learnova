import { jsonSuccess, jsonError } from "@/lib/api-response";
import { authenticateRequest, parseJSON, withErrorHandler } from "@/lib/error-handler";
import { validateGroqBody, callGroq } from "@/lib/ai/groq";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { checkRateLimit } from "@/lib/rateLimit";
import { detectInjection, sanitizeMessage } from "@/utils/promptGuard";

export const POST = withErrorHandler(async (request) => {
  const decodedToken = await authenticateRequest(request);

  // Rate limiting
  const rateLimitResult = await checkRateLimit(decodedToken.uid);
  if (!rateLimitResult.allowed) {
    return jsonError("Too many requests. Please try again later.", 429);
  }

  // Parse body
  const body = await parseJSON(request, 1024 * 10);

  const validation = validateGroqBody(body);

  let rawMessage = "";

  rawMessage = validation.trimmedMessage;

  const trimmedMessage = rawMessage.trim();

  // Check for prompt injection
  const injectionCheck = detectInjection(trimmedMessage);
  if (injectionCheck.isInjection) {
    console.warn(`[nova-ai-safety] Injection blocked for user ${decodedToken.uid}: ${injectionCheck.matchedPattern}`);
    return jsonError("Safety check: System instructions override or prompt injection attempt detected.", 400);
  }

  // Sanitize and call Groq
  const sanitizedMessage = sanitizeMessage(trimmedMessage);
  const content = await callGroq(sanitizedMessage);

  return jsonSuccess({ message: content });
});
