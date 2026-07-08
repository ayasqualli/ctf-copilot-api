export type SqlValidationResult =
  | { ok: true; safeSql: string }
  | { ok: false; reason: string };

const DENYLIST = [
  "insert",
  "update",
  "delete",
  "drop",
  "alter",
  "create",
  "truncate",
  "replace",
  "attach",
  "detach",
  "pragma",
  "vacuum",
  "union",
  "intersect",
  "except",
  "load_extension",
  "sqlite_master",
  "sqlite_schema",
  "information_schema",
  "xp_cmdshell",
  "execute",
  "exec",
  "copy"
];

const ALLOWED_TABLES = new Set(["documents", "chunks", "chunks_fts"]);

export function stripBeforeCheck(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--.*$/gm, " ")
    .replace(/#[^\n\r]*/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function validateDynamicSql(sql: string): SqlValidationResult {
  const normalized = stripBeforeCheck(sql);

  if (!normalized) {
    return { ok: false, reason: "Empty SQL" };
  }

  if (!normalized.startsWith("select ")) {
    return { ok: false, reason: "Only SELECT statements are allowed" };
  }

  if (hasMultipleStatements(normalized)) {
    return { ok: false, reason: "Multiple SQL statements are not allowed" };
  }

  for (const denied of DENYLIST) {
    const pattern = new RegExp(`(^|[^a-z0-9_])${escapeRegExp(denied)}([^a-z0-9_]|$)`, "i");
    if (pattern.test(normalized)) {
      return { ok: false, reason: `Denied SQL keyword detected: ${denied}` };
    }
  }

  const referencedTables = extractReferencedTables(normalized);
  for (const table of referencedTables) {
    if (!ALLOWED_TABLES.has(table)) {
      return { ok: false, reason: `Disallowed table: ${table}` };
    }
  }

  if (referencedTables.size === 0) {
    return { ok: false, reason: "Query must reference an allowed table" };
  }

  const limited = /\blimit\s+\d+\b/.test(normalized)
    ? normalized
    : `${normalized} limit 20`;

  return { ok: true, safeSql: limited };
}

function hasMultipleStatements(sql: string): boolean {
  const withoutTrailing = sql.trim().replace(/;+$/, "");
  return withoutTrailing.includes(";");
}

function extractReferencedTables(sql: string): Set<string> {
  const tables = new Set<string>();
  const regex = /\b(?:from|join)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(sql)) !== null) {
    tables.add(match[1]);
  }

  return tables;
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
