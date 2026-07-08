import { describe, expect, it } from "vitest";
import { safeParseFinalAnswer } from "../src/schemas/finalAnswer.js";

describe("FinalAnswerSchema", () => {
  it("accepts schema-valid answers", () => {
    const parsed = safeParseFinalAnswer({
      shouldContinue: true,
      answer: "hello",
      sources: [],
      toolCalls: [],
      blocked: false,
      error: null
    });

    expect(parsed.error).toBeNull();
    expect(parsed.answer).toBe("hello");
  });

  it("returns forced error path for invalid output", () => {
    const parsed = safeParseFinalAnswer({ answer: 123 });
    expect(parsed.shouldContinue).toBe(false);
    expect(parsed.error?.code).toBe("INVALID_MODEL_OUTPUT");
  });
});
