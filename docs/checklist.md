## BUILD ORDER 

1. Fastify backend
2. GitHub webhook endpoint
3. Signature verification
4. Sync job queue
5. Vault clone `/ pull`
6. Markdown changed-file detection
7. SQLite indexing
8. `/api/index/status`
9. `/api/ask` with Claude + Portkey
10. Tools over indexed notes



# Testing checklist

You need these tests:
Webhook security:
- [ ] accepts valid GitHub signature
- [ ] rejects invalid signature
- [ ] rejects missing signature
- [ ] ignores non-push event

Sync:
- [ ] clones repo if vault-cache does not exist
- [ ] pulls repo if vault-cache exists
- [ ] indexes only .md files
- [ ] ignores `.obsidian` and attachments

Indexing:
- [ ] chunks Markdown by headings
- [ ] skips unchanged files by hash
- [ ] updates changed files

AI gate later:
- [ ] final Claude output validates with Zod
- [ ] forced error path works
- [ ] malicious generated SQL is blocked (SQLi)
* Fun fact: As my last name abreviation is SQL and i'm the Web Exploitation player in my ctf team, my nickname is SQL injection