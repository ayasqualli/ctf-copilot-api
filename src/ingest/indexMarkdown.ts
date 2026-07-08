import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { getDb } from "../db/db.js";
import { chunkMarkdown } from "./chunkMarkdown.js";
import { shouldIndexFile } from "./ignoreRules.js";

export async function indexChangedMarkdownFiles(params: {
  vaultPath: string;
  files: string[];
  commitSha: string;
}) {
  const { vaultPath, files, commitSha } = params;
  const db = getDb();

  let indexedDocuments = 0;
  let indexedChunks = 0;
  let skippedUnchanged = 0;

  const tx = db.transaction((items: Array<{ relPath: string; content: string }>) => {
    for (const item of items) {
      const relPath = normalizeVaultPath(item.relPath);
      const content = item.content;
      const contentHash = sha256(content);
      const documentId = sha256(relPath);
      const title = titleFromPath(relPath, content);

      const existing = db
        .prepare("SELECT content_hash FROM documents WHERE path = ?")
        .get(relPath) as { content_hash: string } | undefined;

      if (existing?.content_hash === contentHash) {
        skippedUnchanged++;
        continue;
      }

      db.prepare(`
        INSERT INTO documents
          (id, path, title, content, content_hash, commit_sha, last_indexed_at)
        VALUES
          (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(path) DO UPDATE SET
          title = excluded.title,
          content = excluded.content,
          content_hash = excluded.content_hash,
          commit_sha = excluded.commit_sha,
          last_indexed_at = excluded.last_indexed_at
      `).run(
        documentId,
        relPath,
        title,
        content,
        contentHash,
        commitSha,
        new Date().toISOString()
      );

      db.prepare("DELETE FROM chunks WHERE document_id = ?").run(documentId);
      db.prepare("DELETE FROM chunks_fts WHERE document_id = ?").run(documentId);

      const chunks = chunkMarkdown(content);

      for (const chunk of chunks) {
        const chunkId = sha256(`${relPath}:${chunk.chunkIndex}`);

        db.prepare(`
          INSERT INTO chunks
            (id, document_id, path, chunk_index, heading, text)
          VALUES
            (?, ?, ?, ?, ?, ?)
        `).run(
          chunkId,
          documentId,
          relPath,
          chunk.chunkIndex,
          chunk.heading,
          chunk.text
        );

        db.prepare(`
          INSERT INTO chunks_fts
            (text, heading, path, document_id)
          VALUES
            (?, ?, ?, ?)
        `).run(chunk.text, chunk.heading, relPath, documentId);

        indexedChunks++;
      }

      indexedDocuments++;
    }
  });

  const items: Array<{ relPath: string; content: string }> = [];

  for (const relPath of files) {
    if (!shouldIndexFile(relPath)) continue;
    const absPath = path.join(vaultPath, relPath);
    const content = await fs.readFile(absPath, "utf8");
    items.push({ relPath, content });
  }

  tx(items);

  return { indexedDocuments, indexedChunks, skippedUnchanged };
}

export function getIndexStatus() {
  const db = getDb();

  const documents = db
    .prepare("SELECT COUNT(*) AS count FROM documents")
    .get() as { count: number };

  const chunks = db
    .prepare("SELECT COUNT(*) AS count FROM chunks")
    .get() as { count: number };

  const lastIndexed = db
    .prepare("SELECT MAX(last_indexed_at) AS value FROM documents")
    .get() as { value: string | null };

  const latestCommit = db
    .prepare("SELECT commit_sha FROM documents ORDER BY last_indexed_at DESC LIMIT 1")
    .get() as { commit_sha: string } | undefined;

  return {
    documents: documents.count,
    chunks: chunks.count,
    lastIndexedAt: lastIndexed.value,
    latestCommitSha: latestCommit?.commit_sha ?? null
  };
}

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function normalizeVaultPath(input: string): string {
  return input.replaceAll("\\", "/").replace(/^\.\//, "");
}

function titleFromPath(relPath: string, content: string): string {
  const firstHeading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (firstHeading) return firstHeading;
  return path.basename(relPath, ".md");
}
