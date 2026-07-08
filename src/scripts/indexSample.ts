import path from "node:path";
import { indexChangedMarkdownFiles, getIndexStatus } from "../ingest/indexMarkdown.js";

const vaultPath = path.resolve("examples/sample-notes");
const files = ["apk-analysis.md"];

const result = await indexChangedMarkdownFiles({
  vaultPath,
  files,
  commitSha: "sample-data"
});

console.log(JSON.stringify({ result, status: getIndexStatus() }, null, 2));
