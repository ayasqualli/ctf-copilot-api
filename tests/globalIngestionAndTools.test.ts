import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetConfigForTests } from "../src/config.js";
import { closeDbForTests, getDb } from "../src/db/db.js";
import { chunkMarkdown } from "../src/ingest/chunkMarkdown.js";
import { shouldIndexFile } from "../src/ingest/ignoreRules.js";
import { getIndexStatus, indexChangedMarkdownFiles } from "../src/ingest/indexMarkdown.js";
import { queryNotes } from "../src/tools/queryNotes.js";
import { readNote } from "../src/tools/readNote.js";
import { searchNotes } from "../src/tools/searchNotes.js";
import { createToolContext, makeTempDir, resetTestEnvironment, writeVaultFile } from "./_helpers.js";

let tempDir: string;

async function seedVault() {
  tempDir = await makeTempDir("vault-tools-");

  resetTestEnvironment({
    DATABASE_PATH: `${tempDir}/notes.db`,
    VAULT_LOCAL_PATH: tempDir
  });

  await writeVaultFile(
    tempDir,
    "security/apk-analysis.md",
    `# APK Analysis\nUse jadx and apktool for static analysis.\n\n## Dynamic Analysis\nUse MobSF, Frida, emulator snapshots, and network capture.`
  );

  await writeVaultFile(
    tempDir,
    "ctf/reverse.md",
    `# Reverse Engineering\nUse Ghidra, radare2, strings, ltrace, and gdb.`
  );

  await writeVaultFile(tempDir, ".obsidian/workspace.json", "{}");

  await indexChangedMarkdownFiles({
    vaultPath: tempDir,
    files: ["security/apk-analysis.md", "ctf/reverse.md", ".obsidian/workspace.json"],
    commitSha: "seed-commit"
  });
}

describe("Markdown chunking and ignore rules", () => {
  it("chunks markdown by headings", () => {
    const chunks = chunkMarkdown("# Main\nIntro\n\n## Child\nDetails");

    expect(chunks).toHaveLength(2);
    expect(chunks[0].heading).toBe("Main");
    expect(chunks[1].heading).toBe("Child");
  });

  it("handles files without headings", () => {
    const chunks = chunkMarkdown("Plain note without a heading.");

    expect(chunks).toHaveLength(1);
    expect(chunks[0].heading).toBeNull();
    expect(chunks[0].text).toContain("Plain note");
  });

  it("ignores Obsidian internals and non-markdown files", () => {
    expect(shouldIndexFile("security/note.md")).toBe(true);
    expect(shouldIndexFile(".obsidian/workspace.json")).toBe(false);
    expect(shouldIndexFile("attachments/image.png")).toBe(false);
    expect(shouldIndexFile("papers/report.pdf")).toBe(false);
    expect(shouldIndexFile("node_modules/pkg/readme.md")).toBe(false);
  });
});

describe("indexing and tools over the local notes DB", () => {
  beforeEach(async () => {
    await seedVault();
  });

  afterEach(() => {
    closeDbForTests();
    resetConfigForTests();
  });

  it("indexes markdown files and ignores non-indexable files", () => {
    const status = getIndexStatus();

    expect(status.documents).toBe(2);
    expect(status.chunks).toBeGreaterThanOrEqual(2);
    expect(status.latestCommitSha).toBe("seed-commit");
  });

  it("skips unchanged files by content hash", async () => {
    const result = await indexChangedMarkdownFiles({
      vaultPath: tempDir,
      files: ["security/apk-analysis.md"],
      commitSha: "second-commit"
    });

    expect(result.indexedDocuments).toBe(0);
    expect(result.skippedUnchanged).toBe(1);
  });

  it("search_notes finds relevant chunks and records sources", async () => {
    const ctx = createToolContext(getDb());

    const result = await searchNotes(ctx, { query: "Frida emulator", limit: 5 });

    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results[0].path).toBe("security/apk-analysis.md");
    expect(ctx.retrievedSources.length).toBeGreaterThan(0);
  });

  it("read_note returns full indexed note content", async () => {
    const ctx = createToolContext(getDb());

    const result = await readNote(ctx, { path: "ctf/reverse.md" });

    expect(result.title).toBe("Reverse Engineering");
    expect(result.content).toContain("Ghidra");
    expect(ctx.retrievedSources[0].path).toBe("ctf/reverse.md");
  });

  it("read_note blocks path traversal", async () => {
    const ctx = createToolContext(getDb());

    await expect(readNote(ctx, { path: "../.env" })).rejects.toThrow(/Unsafe vault path/);
  });

  it("query_notes runs safe SELECT queries", async () => {
    const ctx = createToolContext(getDb());

    const result = await queryNotes(ctx, {
      sql: "SELECT title, path FROM documents WHERE title LIKE '%APK%' LIMIT 5"
    });

    expect(result.blocked).toBe(false);
    expect(result.rows.length).toBeGreaterThan(0);
  });

  it("query_notes blocks dangerous generated SQL and updates context", async () => {
    const ctx = createToolContext(getDb());

    await expect(queryNotes(ctx, { sql: "DROP TABLE documents" })).rejects.toThrow(
      /GUARDRAIL_BLOCKED_SQL/
    );

    expect(ctx.blocked).toBe(true);
    expect(ctx.errors.length).toBeGreaterThan(0);
  });
});
