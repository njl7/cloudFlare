CREATE TABLE conversations (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY NOT NULL,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  sources_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);

CREATE INDEX messages_conversation_created
  ON messages (conversation_id, created_at);

CREATE TABLE documents (
  id TEXT PRIMARY KEY NOT NULL,
  filename TEXT NOT NULL,
  ai_search_key TEXT NOT NULL UNIQUE,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('indexing', 'queued', 'ready', 'failed')),
  created_at TEXT NOT NULL
);
