import { useEffect, useRef, useState, type ReactNode } from 'react'
import './App.css'

type Conversation = {
  id: string
  title: string
  updated_at: string
}

type Source = {
  id: string
  name: string
  excerpt: string
  score: number
}

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources: Source[]
  created_at: string
}

type DocumentRecord = {
  id: string
  filename: string
  file_type: string
  file_size: number
  status: 'indexing' | 'queued' | 'ready' | 'failed'
  created_at: string
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init)
  const body: unknown = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message = typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
      ? body.error
      : `Request failed (${response.status})`
    throw new Error(message)
  }

  return body as T
}

function Icon({
  name,
  size = 18,
}: {
  name: 'spark' | 'plus' | 'message' | 'file' | 'upload' | 'send' | 'book' | 'arrow' | 'close'
  size?: number
}) {
  const paths: Record<typeof name, ReactNode> = {
    spark: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path d="m19 14 .9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14Z" /></>,
    plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
    message: <><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h8" /></>,
    upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m17 8-5-5-5 5M12 3v12" /></>,
    send: <><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></>,
    book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></>,
    arrow: <><path d="M7 17 17 7M7 7h10v10" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  )
}

function formatBytes(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function App() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const messageEnd = useRef<HTMLDivElement>(null)

  async function loadWorkspace() {
    const [conversationData, documentData] = await Promise.all([
      api<{ conversations: Conversation[] }>('/api/conversations'),
      api<{ documents: DocumentRecord[] }>('/api/documents'),
    ])
    setConversations(conversationData.conversations)
    setDocuments(documentData.documents)
    return conversationData.conversations
  }

  useEffect(() => {
    let active = true
    async function initialize() {
      try {
        const existing = await loadWorkspace()
        if (active && existing[0]) {
          setActiveId(existing[0].id)
          const result = await api<{ messages: Message[] }>(`/api/conversations/${existing[0].id}/messages`)
          if (active) setMessages(result.messages)
        }
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : 'Could not load your workspace.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void initialize()
    return () => { active = false }
  }, [])

  useEffect(() => {
    messageEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, sending])

  useEffect(() => {
    if (!documents.some((document) => document.status === 'indexing' || document.status === 'queued')) return
    const timer = window.setInterval(() => {
      void api<{ documents: DocumentRecord[] }>('/api/documents')
        .then((result) => setDocuments(result.documents))
        .catch((reason: unknown) => {
          console.error('Could not refresh document indexing status', reason)
          setError(reason instanceof Error ? reason.message : 'Could not refresh document status.')
        })
    }, 6000)
    return () => window.clearInterval(timer)
  }, [documents])

  async function startConversation() {
    setError(null)
    try {
      const result = await api<{ conversation: Conversation }>('/api/conversations', { method: 'POST' })
      setConversations((items) => [result.conversation, ...items])
      setActiveId(result.conversation.id)
      setMessages([])
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not start a conversation.')
    }
  }

  async function selectConversation(conversation: Conversation) {
    setError(null)
    setActiveId(conversation.id)
    try {
      const result = await api<{ messages: Message[] }>(`/api/conversations/${conversation.id}/messages`)
      setMessages(result.messages)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load this conversation.')
    }
  }

  async function sendMessage(text = prompt) {
    const content = text.trim()
    if (!content || sending) return

    setPrompt('')
    setError(null)
    setSending(true)
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      sources: [],
      created_at: new Date().toISOString(),
    }
    setMessages((items) => [...items, userMessage])

    try {
      let conversationId = activeId
      if (!conversationId) {
        const created = await api<{ conversation: Conversation }>('/api/conversations', { method: 'POST' })
        conversationId = created.conversation.id
        setActiveId(conversationId)
        setConversations((items) => [created.conversation, ...items])
      }

      const result = await api<{ answer: string; sources: Source[]; message: Message }>('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ conversationId, message: content }),
      })
      setMessages((items) => [...items, result.message])
      const updated = await loadWorkspace()
      setConversations(updated)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The answer could not be generated.')
    } finally {
      setSending(false)
    }
  }

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    setError(null)
    try {
      for (const file of Array.from(files)) {
        const form = new FormData()
        form.set('file', file)
        await api('/api/documents/upload', { method: 'POST', body: form })
      }
      const result = await api<{ documents: DocumentRecord[] }>('/api/documents')
      setDocuments(result.documents)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Document upload failed.')
      try {
        const result = await api<{ documents: DocumentRecord[] }>('/api/documents')
        setDocuments(result.documents)
      } catch (refreshError) {
        console.error('Could not refresh the document list after upload failed', refreshError)
      }
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const activeConversation = conversations.find((item) => item.id === activeId)
  const suggestions = [
    'What are the key ideas in my documents?',
    'Summarize the most important findings',
    'What should I know before getting started?',
  ]

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Icon name="spark" size={20} /></div>
          <span>folio<span className="brand-period">.</span></span>
          <span className="brand-label">KNOWLEDGE AI</span>
        </div>

        <button className="new-chat-button" disabled={sending} onClick={() => void startConversation()}>
          <Icon name="plus" size={17} /> New conversation
          <span className="shortcut">⌘ K</span>
        </button>

        <div className="sidebar-section">
          <div className="section-heading">RECENT</div>
          <nav className="conversation-list" aria-label="Recent conversations">
            {conversations.map((conversation) => (
              <button
                className={`conversation-link ${activeId === conversation.id ? 'selected' : ''}`}
                key={conversation.id}
                disabled={sending}
                onClick={() => void selectConversation(conversation)}
                title={conversation.title}
              >
                <Icon name="message" size={15} />
                <span>{conversation.title}</span>
              </button>
            ))}
            {!loading && conversations.length === 0 && <p className="sidebar-empty">Your conversations will appear here.</p>}
          </nav>
        </div>

        <div className="sidebar-section documents-section">
          <div className="section-heading">
            <span>YOUR LIBRARY</span>
            <span className="document-count">{documents.length}</span>
          </div>
          <div className="document-list">
            {documents.map((document) => (
              <div className="document-item" key={document.id} title={document.filename}>
                <span className="document-icon"><Icon name="file" size={15} /></span>
                <span className="document-details">
                  <span className="document-name">{document.filename}</span>
                  <span className="document-meta">
                    {document.status === 'indexing' || document.status === 'queued' ? 'Indexing' : document.status === 'failed' ? 'Indexing failed' : formatBytes(document.file_size)}
                  </span>
                </span>
                <span className={`status-dot ${document.status}`} aria-label={document.status} />
              </div>
            ))}
            {!loading && documents.length === 0 && <p className="sidebar-empty">Upload a document to begin.</p>}
          </div>
          <input
            ref={fileInput}
            className="visually-hidden"
            type="file"
            multiple
            accept=".pdf,.txt,.md,.markdown,.docx,.csv,.html,.htm,.json,.xml,.xlsx,.xls"
            onChange={(event) => void uploadFiles(event.currentTarget.files)}
          />
          <button className="upload-button" disabled={uploading} onClick={() => fileInput.current?.click()}>
            <Icon name="upload" size={16} />
            {uploading ? 'Uploading…' : 'Add documents'}
          </button>
          <p className="upload-hint">PDF & office files ≤4 MB · text files ≤10 MB</p>
        </div>

        <div className="sidebar-bottom">
          <div className="security-note"><span className="security-indicator" /> Private workspace</div>
          <div className="user-profile">
            <div className="avatar">K</div>
            <div><strong>Knowledge space</strong><span>Personal workspace</span></div>
            <span className="profile-menu">···</span>
          </div>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="breadcrumbs">
            <span className="crumb-root">Workspace</span><span className="crumb-divider">/</span>
            <span className="crumb-current">{activeConversation?.title ?? 'New conversation'}</span>
          </div>
          <div className="topbar-right">
            <span className="model-badge"><span className="model-dot" /> LLAMA 3.3</span>
            <button className="icon-button" aria-label="Upload a document" title="Upload a document" onClick={() => fileInput.current?.click()}><Icon name="upload" size={17} /></button>
          </div>
        </header>

        <section className={`chat-area ${messages.length === 0 ? 'empty-chat' : ''}`}>
          {loading ? (
            <div className="loading-state"><span className="loader" /> Loading your knowledge space…</div>
          ) : messages.length === 0 ? (
            <div className="welcome-content">
              <div className="welcome-icon"><Icon name="spark" size={24} /></div>
              <div className="eyebrow"><span /> YOUR DOCUMENTS, UNDERSTOOD</div>
              <h1>Good ideas start<br />with <em>good questions.</em></h1>
              <p className="welcome-description">
                Ask anything about your documents. Folio finds the relevant passages and gives you an answer you can trace back to its source.
              </p>
              <div className="suggestion-grid">
                {suggestions.map((suggestion, index) => (
                  <button className="suggestion-card" key={suggestion} onClick={() => void sendMessage(suggestion)}>
                    <span className={`suggestion-symbol symbol-${index}`}>{index === 0 ? '✳' : index === 1 ? '↗' : '◎'}</span>
                    <span>{suggestion}</span>
                    <Icon name="arrow" size={15} />
                  </button>
                ))}
              </div>
              {documents.length === 0 && (
                <button className="first-upload" onClick={() => fileInput.current?.click()}>
                  <Icon name="upload" size={16} /> Upload your first document
                </button>
              )}
            </div>
          ) : (
            <div className="message-list">
              <div className="thread-heading">
                <span className="thread-day">TODAY</span>
                <span className="thread-line" />
                <span className="thread-context">{activeConversation?.title ?? 'Knowledge assistant'}</span>
              </div>
              {messages.map((message) => (
                <article className={`message-row ${message.role}`} key={message.id}>
                  <div className={`message-avatar ${message.role}`}>
                    {message.role === 'assistant' ? <Icon name="spark" size={16} /> : 'K'}
                  </div>
                  <div className="message-body">
                    <div className="message-author">{message.role === 'assistant' ? 'Folio' : 'You'} <time>{new Date(message.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time></div>
                    <p className="message-text">{message.content}</p>
                    {message.sources.length > 0 && (
                      <div className="sources">
                        <div className="sources-heading"><span className="sources-rule" /> SOURCES <span className="source-count">{message.sources.length}</span></div>
                        {message.sources.map((source, index) => (
                          <details className="source-card" key={source.id}>
                            <summary>
                              <span className="source-number">{String(index + 1).padStart(2, '0')}</span>
                              <span className="source-name">{source.name}</span>
                              <span className="source-score">{Math.round(source.score * 100)}% match</span>
                            </summary>
                            <p>{source.excerpt}</p>
                          </details>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              ))}
              {sending && <div className="thinking-row"><span className="loader" /> Searching your library and drafting an answer…</div>}
              <div ref={messageEnd} />
            </div>
          )}
        </section>

        {error && <div className="error-banner" role="alert"><span>{error}</span><button aria-label="Dismiss error" onClick={() => setError(null)}><Icon name="close" size={15} /></button></div>}

        <footer className="composer-wrap">
          <form className="composer" onSubmit={(event) => { event.preventDefault(); void sendMessage() }}>
            <textarea
              aria-label="Ask about your documents"
              placeholder="Ask a question about your documents…"
              value={prompt}
              maxLength={4000}
              rows={1}
              onChange={(event) => setPrompt(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  void sendMessage()
                }
              }}
            />
            <div className="composer-actions">
              <span className="composer-tip"><kbd>↵</kbd> to send <span>·</span> <kbd>⇧ ↵</kbd> new line</span>
              <button className="send-button" type="submit" disabled={!prompt.trim() || sending} aria-label="Send message"><Icon name="send" size={17} /></button>
            </div>
          </form>
          <p className="disclaimer">Folio answers from your documents. Always verify important details against the source.</p>
        </footer>
      </main>
    </div>
  )
}

export default App
