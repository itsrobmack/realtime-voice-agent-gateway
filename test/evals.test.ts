import { describe, expect, test } from "bun:test";
import { runVoiceEvalSuite } from "../src/evals";

describe("realtime voice eval suite", () => {
  test("validates final transcript, interruption, and partial transcript behavior", async () => {
    const results = await runVoiceEvalSuite();

    expect(results).toHaveLength(3);
    expect(results.every((result) => result.passed)).toBe(true);
    expect(results.map((result) => result.finalState)).toEqual(["listening", "listening", "listening"]);
  });
});
