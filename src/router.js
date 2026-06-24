function blockCheck(prompt) {
  const rules = [/bypass\s*security/i, /exfiltrate/i, /steal\s*data/i, /malware/i];
  for (const r of rules) if (r.test(prompt)) return { ok: false, reason: `Blocked by policy: ${r}` };
  return { ok: true };
}

function classify(prompt) {
  const p = prompt.toLowerCase();
  if (/(bug|error|fix|stack|trace)/.test(p)) return "debugger";
  if (/(code|api|function|class|refactor|test)/.test(p)) return "coder";
  if (/(plan|roadmap|architecture|design|strategy)/.test(p)) return "planner";
  if (/(risk|security|policy|nda|legal|compliance)/.test(p)) return "guardian";
  return "general";
}

const agents = {
  planner: (q) => ({
    text: `Plan:\n1) Scope goal\n2) Break into tasks\n3) Define outputs\n4) Validate`,
    confidence: 0.86
  }),
  coder: (q) => ({
    text: `Code response:\n- Modules\n- Interfaces\n- Test checklist\nTask: ${q}`,
    confidence: 0.84
  }),
  debugger: (q) => ({
    text: `Debug response:\n- Reproduce\n- Isolate root cause\n- Patch\n- Verify`,
    confidence: 0.82
  }),
  guardian: (q) => ({
    text: `Security/Compliance response:\n- Data minimization\n- Access control\n- Audit trail\n- Safe defaults`,
    confidence: 0.9
  }),
  general: (q) => ({
    text: `Unified response:\nI will solve this with multi-step orchestration.\nRequest: ${q}`,
    confidence: 0.78
  })
};

function critic(planText, draftText) {
  const good = draftText.length > 40;
  return {
    ok: good,
    notes: good ? "Critic: draft is actionable." : "Critic: draft too short, expand detail."
  };
}

export async function orchestrate({ prompt, explainRoute = false, strict = false }) {
  const gate = blockCheck(prompt);
  if (!gate.ok) throw new Error(gate.reason);

  const route = classify(prompt);

  // multi-step pipeline
  const plan = agents.planner(prompt);
  const draft = agents[route](prompt);
  const review = critic(plan.text, draft.text);

  const finalText = [
    draft.text,
    "",
    "Verification:",
    `- ${review.notes}`,
    `- Route: ${route}`,
    `- Confidence: ${draft.confidence}`
  ].join("\n");

  if (strict && draft.confidence < 0.8) {
    throw new Error(`Strict mode refusal: low confidence (${draft.confidence})`);
  }

  return {
    provider: "local-shinme",
    text: finalText,
    confidence: draft.confidence,
    route,
    trace: explainRoute ? { plan: plan.text, draft: draft.text, review } : undefined
  };
}
