import { Command } from "commander";
const p = new Command();
p.name("codex-fugu").version("1.0.0");
p.command("ask").argument("<prompt>").action((prompt)=>console.log("Shinme:", prompt));
p.command("dashboard").action(()=>console.log("Dashboard prototype: READY"));
await p.parseAsync(process.argv);
export async function runCli() {}
