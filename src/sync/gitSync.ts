import fs from "node:fs/promises";
import path from "node:path";
import { simpleGit } from "simple-git";
import { getConfig } from "../config.js";
import { indexChangedMarkdownFiles } from "../ingest/indexMarkdown.js";


export type SyncMetadata= {
    deliveryId?: string;
    repository?: string;
    afterCommit?: string;
    branchRef?: string;
};

export async function syncVaultNow(
    source: "girhub-webhook" | "manual",
    metadata?: SyncMetadata
) {
    const config = getConfig();

    if (!config.vaultRepoUrl) {
        throw new Error ("VAULT_REPO_URL is required for sync");
    }

    const localPath = config.vaultLocalPath;
    await fs.mkdir(path.dirname(localPath), {recursive:true});

    const hasGit = await pathExists(path.join(localPath, ".git"));

    if (!hasGit) {
        const git = simpleGit();
        await git.clone(config.vaultRepoUrl, localPath, ["--branch", config.vaultBranch]);
    } else {
        const git = simpleGit(localPath);
        await git.fetch("origin", config.vaultBranch);
        await git.checkout(config.vaultBranch);
        await git.pull("origin", config.vaultBranch);
    }

    const git = simpleGit(localPath);
    const commitSha = (await git.revparse(["HEAD"])).trim();
    const changedFiles = await indexChangedMarkdownFiles(localPath);
    const indexed = await indexChangedMarkdownFiles({
        vaultPath: localPath,
        files: changedFiles,
        commitSha
    });

    return {
        ok: true,
        source,
        commitSha,
        changedFiles,
        indexed,
        metadata
    };
}

async function listenTrackedMarkdownFiles(localPath: string) : Promise<string[]> {
    const git = simpleGit(localPath);
    const raw = await git.raw(["ls-files", "*.md"]);
    return raw.split("\n").map((file) => file.trim()).filter(Boolean);
}

async function pathExists(p: string): Promise <boolean> {
    try{
        await fs.access(p);
        return true;
    } catch {
        return false;
    }
}

