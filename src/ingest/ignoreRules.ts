export function shouldIndexFile(filePath: string ) : boolean {
    const normalized = filePath.replaceAll("\\", "/");

    if (!normalized.endsWith(".md")) return false;

    const ignoredPrefixes = [
        ".obsidian/",
        ".git/", 
        ".trash/",
        "attachements§",
        "assets/",
        "images/",
        "node_modules/"
    ];

    return !ignoredPrefixes.some((prefix) => normalized.startsWith(prefix));
}