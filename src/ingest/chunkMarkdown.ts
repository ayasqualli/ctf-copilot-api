export type MarkdownChunk = {
  chunkIndex: number;
  heading: string | null;
  text: string;
};

const MAX_CHARS = 2400;

export function chunkMarkdown(content: string): MarkdownChunk[] {
  const lines = content.split(/\r?\n/);
  const chunks: MarkdownChunk[] = [];
  let currentHeading: string | null = null;
  let buffer: string[] = [];

  function pushChunk(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    chunks.push({
      chunkIndex: chunks.length,
      heading: currentHeading,
      text: trimmed,
    });
  }

  function flush() {
    const joined = buffer.join("\n").trim();
    if (!joined) {
      buffer = [];
      return;
    }

    if (joined.length <= MAX_CHARS) {
      pushChunk(joined);
    } else {
      for (let i = 0; i < joined.length; i += MAX_CHARS) {
        pushChunk(joined.slice(i, i + MAX_CHARS));
      }
    }
    buffer = [];
  }
  for (const line of lines) {
    if (/^#{1,6}\s+/.test(line)) {
      flush();
      currentHeading = line.replace(/^#{1,6}\s+/, "").trim();
      buffer.push(line);
    } else {
      buffer.push(line);
    }
  }

  flush();
  return chunks;
}
