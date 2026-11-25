# Folio — AI Knowledge Assistant

A React + TypeScript chat app served by a Cloudflare Worker. It uploads documents to Cloudflare AI Search, generates answers with Llama 3.3, returns the retrieved passages as citations, and stores conversation history in D1.

## Architecture

```text
React + Vite UI
      │ same-origin /api/*
      ▼
Cloudflare Worker
  ├─ AI Search: document indexing, retrieval, and Llama 3.3 responses
  └─ D1: document metadata, conversation history, and citations
```

Uploaded file contents live in AI Search's built-in storage. D1 stores only document metadata and chat history. The first version uses one knowledge base; the schema reserves document IDs and is ready to extend with user and knowledge-base ownership.

## Local setup

Requirements: Node.js and a Cloudflare account with AI Search enabled.

```powershell
npm install
npm run db:migrate:local
npm run cf-typegen
npm run dev
```

The React app and Worker run together through the Cloudflare Vite plugin. AI Search is a remote binding during local development, so Wrangler must be authenticated and the remote instance must exist.
Set `CLOUDFLARE_API_TOKEN` in your local shell before `npm run dev`; do not commit the token or put it in frontend code.

### Create the AI Search instance

In the Cloudflare dashboard, create an AI Search instance in the `default` namespace named **`knowledge-assistant`**. It must be in the same Cloudflare account as the API token used by local development. Keep built-in storage enabled and use the Workers AI model `@cf/meta/llama-3.3-70b-instruct-fp8-fast` for generation. The Worker binding is configured in `wrangler.jsonc`.

The upload API accepts PDF (up to 4 MB), TXT, Markdown, DOCX, CSV, HTML, JSON, XML, XLSX, and XLS files (up to 10 MB for text formats and 4 MB for converted formats). OCR must be enabled in the AI Search instance if you need to search scanned PDFs.

## Cloud deployment

1. Create a D1 database named `knowledge-assistant-db`:

   ```powershell
   npx wrangler d1 create knowledge-assistant-db
   ```

2. Replace the placeholder `database_id` in `wrangler.jsonc` with the UUID returned by Wrangler.
3. Apply the migration and deploy:

   ```powershell
   npm run db:migrate:remote
   npm run deploy
   ```

The AI Search namespace binding is remote. Ensure the `knowledge-assistant` instance exists in the account used by Wrangler before deploying.

## Security before public deployment

This starter is a single-user prototype and does not implement application-level sign-in or tenant isolation. **Do not expose it publicly with sensitive documents.** Put the Worker behind Cloudflare Access before sharing it. Before adding multiple users or knowledge bases, add authenticated user identity to the API, store ownership on documents and conversations, and enforce ownership checks on every upload, search, and history request. AI Search metadata filtering should be configured before sharing one index across tenants.

## Useful commands

```powershell
npm run dev
npm run build
npm run lint
npm run cf-typegen
npm run db:migrate:local
npm run deploy
```
