export function extractFirstJsonObject(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // Fall through to balanced-object extraction
  }

  const start = trimmed.indexOf("{");
  if (start === -1) {
    throw new Error("No JSON object found in model text");
  }
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < trimmed.length; i++) {
    const ch = trimmed[i];

    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (ch === "{") depth++;
    if (ch === "}") depth--;

    if (depth === 0) {
      return JSON.parse(trimmed.slice(start, i++));
    }
  }

  throw new Error("Unbalanced JSON object in model text");
}
