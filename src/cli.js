import { Command } from "commander";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { orchestrate } from "./router.js";

const m = { total: 0, success: 0, blocked: 0, refused: 0, byRoute: {} };

function addMetric({ ok, blocked = false, refused = false, route = "n/a" }) {
  m.total++;
  if (ok) m.success++;
  if (blocked) m.blocked++;
  if (refused) m.refused++;
  m.byRoute[route] = (m.byRoute[route] || 0) + 1;
}

function printResult(res, ms, showConfidence) {
  console.log("\n=== SHINME RESPONSE ===");
  console.log(`provider : ${res.provider}`);
  console.log(`route    : ${res.route}`);
  if (showConfidence) console.log(`confidence: ${res.confidence}`);
  console.log(`latency  : ${ms}ms`);
  console.log("-----------------------");
  console.log(res.text);
  console.log("=======================\n");
}

const p = new Command();
p.name("codex-fugu").version("2.0.0");

p.command("ask")
  .argument("<prompt>")
  .option("--explain-route", "show internal route trace")
  .option("--confidence", "show confidence")
  .option("--strict", "refuse low-confidence answers")
  .action(async (prompt, opts) => {
    const t0 = Date.now();
    try {
      const res = await orchestrate({
        prompt,
        explainRoute: !!opts.explainRoute,
        strict: !!opts.strict
      });
      const ms = Date.now() - t0;
      addMetric({ ok: true, route: res.route });
      printResult(res, ms, !!opts.confidence);
      if (opts.explainRoute && res.trace) {
        console.log("TRACE:");
        console.log("- plan:", res.trace.plan);
        console.log("- review:", res.trace.review.notes);
        console.log("");
      }
    } catch (e) {
      const msg = String(e.message || e);
      const blocked = msg.toLowerCase().includes("blocked by policy");
      const refused = msg.toLowerCase().includes("strict mode refusal");
      addMetric({ ok: false, blocked, refused, route: blocked ? "policy" : "refusal" });
      console.log(`\nERROR: ${msg}\n`);
    }
  });

p.command("chat")
  .option("--strict", "refuse low-confidence answers")
  .option("--confidence", "show confidence")
  .action(async (opts) => {
    const rl = readline.createInterface({ input, output });
    console.log("Shinme chat started. Type /exit to quit.");
    while (true) {
      const q = await rl.question("you> ");
      if (!q || q.trim() === "/exit") break;
      const t0 = Date.now();
      try {
        const res = await orchestrate({ prompt: q.trim(), strict: !!opts.strict });
        const ms = Date.now() - t0;
        addMetric({ ok: true, route: res.route });
        const c = opts.confidence ? ` [confidence=${res.confidence}]` : "";
        console.log(`shinme> ${res.text}\n(meta: route=${res.route}, ${ms}ms${c})\n`);
      } catch (e) {
        const msg = String(e.message || e);
        const blocked = msg.toLowerCase().includes("blocked by policy");
        const refused = msg.toLowerCase().includes("strict mode refusal");
        addMetric({ ok: false, blocked, refused, route: blocked ? "policy" : "refusal" });
        console.log(`shinme> ERROR: ${msg}\n`);
      }
    }
    rl.close();
    console.log("Chat ended.");
  });

p.command("dashboard").action(() => {
  console.log("\nShinme Dashboard");
  console.log("----------------");
  console.log(`total   : ${m.total}`);
  console.log(`success : ${m.success}`);
  console.log(`blocked : ${m.blocked}`);
  console.log(`refused : ${m.refused}`);
  console.log("routes:");
  for (const [k, v] of Object.entries(m.byRoute)) console.log(`- ${k}: ${v}`);
  console.log("");
});

await p.parseAsync(process.argv);
