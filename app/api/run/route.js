import { parseJsonRequest, validateRequestBody, toSafeError } from "@/lib/production-guardrails";
import { Agent, run } from "@openai/agents";

export const runtime = "nodejs";

const MODEL = process.env.OPENAI_AGENT_MODEL || "gpt-5.6";

function offlineResult(prompt) {
  return `
OpenAI Agents Research Assistant offline agent run

User input:
${prompt}

Agent output:
Summary:
This starter is ready for an OpenAI Agents SDK workflow.

Plan:
- Define the specialist in app/api/run/route.js.
- Keep instructions narrow and auditable.
- Add tools only after the single-agent loop works.
- Add guardrails before side effects or high-stakes actions.

Production checklist:
- Authentication
- Rate limits
- Tracing
- Human escalation
- Persistent conversation state
`.trim();
}

export async function POST(request) {
  const body = await parseJsonRequest(request);
  const guardrail = validateRequestBody(body);
  if (!guardrail.ok) {
    return Response.json({ error: guardrail.error }, { status: guardrail.status });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";

  if (!prompt) {
    return Response.json({ error: "prompt is required" }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return Response.json({
      demo: true,
      model: "offline-fallback",
      output: offlineResult(prompt),
    });
  }

  try {
    const agent = new Agent({
      name: "OpenAI Agents Research Assistant",
      model: MODEL,
      instructions: `
A research assistant starter using the OpenAI Agents SDK pattern with structured research briefs.

Return with:
Summary
Analysis
Recommended Workflow
Risks
Next Steps

Stay practical, concise, and production-minded.
`.trim(),
    });

    const result = await run(agent, prompt);

    return Response.json({
      demo: false,
      model: MODEL,
      output: result.finalOutput,
      lastAgent: result.lastAgent?.name || "OpenAI Agents Research Assistant",
    });
  } catch (error) {
    return Response.json(
      { error: toSafeError(error, "Agent run failed.") },
      { status: 500 },
    );
  }
}
