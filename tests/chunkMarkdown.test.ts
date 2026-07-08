import { describe, expect, it } from "vitest";
import { chunkMarkdown } from "../src/ingest/chunkMarkdown.js";

describe("chunkMarkdown", () => {
  it("chunks markdown by headings", () => {
    const chunks = chunkMarkdown(`# APK Analysis\nUse jadx.\n\n## Dynamic\nUse emulator.`);
    expect(chunks.length).toBe(2);
    expect(chunks[0].heading).toBe("APK Analysis");
    expect(chunks[1].heading).toBe("Dynamic");
  });
});
