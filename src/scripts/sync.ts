import { syncVaultNow } from "../sync/gitSync.js";

const result = await syncVaultNow("manual");
console.log(JSON.stringify(result, null, 2));
