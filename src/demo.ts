import { runVoiceEvalSuite } from "./evals";

const results = await runVoiceEvalSuite();
console.table(results.map((result) => ({ name: result.name, passed: result.passed, finalState: result.finalState })));
