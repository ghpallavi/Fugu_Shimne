#!/usr/bin/env node
import { runCli } from "../src/cli.js";
runCli().catch((e) => { console.error(e.message); process.exit(1); });
