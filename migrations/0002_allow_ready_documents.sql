CREATE TABLE documents_new (
  id TEXT PRIMARY KEY NOT NULL,
  filename TEXT NOT NULL,
  ai_search_key TEXT NOT NULL UNIQUE,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('indexing', 'queued', 'ready', 'failed')),
  created_at TEXT NOT NULL
);

INSERT INTO documents_new (id, filename, ai_search_key, file_type, file_size, status, created_at)
SELECT id, filename, ai_search_key, file_type, file_size, status, created_at
FROM documents;

DROP TABLE documents;
ALTER TABLE documents_new RENAME TO documents;
