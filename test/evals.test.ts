import { describe, expect, test } from "bun:test";
import { runVoiceEvalSuite } from "../src/evals";

describe("realtime voice eval suite", () => {
  test("validates final transcript, interruption, partial transcript, and session end behavior", async () => {
    const results = await runVoiceEvalSuite();

    expect(results).toHaveLength(5);
    expect(results.every((result) => result.passed)).toBe(true);
    expect(results.map((result) => result.finalState)).toEqual(["listening", "listening", "listening", "listening", "ended"]);
  });
});
