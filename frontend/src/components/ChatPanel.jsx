import { useState, useRef, useEffect } from 'react'
import { queryKnowledge } from '../api'
import ReactMarkdown from 'react-markdown'
import './ChatPanel.css'

const SUGGESTED_PROMPTS = [
  "What are the main topics covered in my documents?",
  "Summarize the key findings from the uploaded files.",
  "What does the document say about risks or challenges?",
  "Give me an overview of the most important points.",
]

export default function ChatPanel({ documents }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [topK, setTopK] = useState(5)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const getHistory = () =>
    messages.map(m => ({ role: m.role, content: m.content }))

  const sendMessage = async (text) => {
    const query = (text || input).trim()
    if (!query || loading) return

    const userMsg = { id: Date.now(), role: 'user', content: query }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await queryKnowledge(query, topK, getHistory())
      const assistantMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: res.answer,
        sources: res.sources,
        chunksUsed: res.chunks_used,
        model: res.model,
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: `**Error:** ${err.message}`,
        error: true,
      }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => {
    if (messages.length === 0) return
    if (confirm('Clear conversation history?')) setMessages([])
  }

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <div className="chat-title">
          <h1>Knowledge Assistant</h1>
          <span className="chat-status">
            <span className="status-dot" />
            {documents.length > 0
              ? `${documents.length} document${documents.length !== 1 ? 's' : ''} loaded`
              : 'No documents'}
          </span>
        </div>
        <div className="chat-controls">
          <label className="topk-label">
            <span>Chunks</span>
            <select
              value={topK}
              onChange={e => setTopK(Number(e.target.value))}
              className="topk-select"
            >
              {[3, 5, 8, 10].map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </label>
          <button className="clear-btn" onClick={clearChat} title="Clear chat">
            🗑
          </button>
        </div>
      </div>

      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <h2>Ask your knowledge base</h2>
            <p>Upload documents then ask questions. The AI will find relevant info and answer.</p>
            {documents.length === 0 && (
              <div className="empty-warning">
                ⚠ No documents uploaded yet. Go to Upload Docs to add files.
              </div>
            )}
            <div className="suggested-prompts">
              <div className="prompts-label">Try asking:</div>
              <div className="prompts-grid">
                {SUGGESTED_PROMPTS.map((p, i) => (
                  <button key={i} className="prompt-chip" onClick={() => sendMessage(p)}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="messages-list">
            {messages.map(msg => (
              <div key={msg.id} className={`message message-${msg.role} ${msg.error ? 'message-error' : ''}`}>
                <div className="message-avatar">
                  {msg.role === 'user' ? 'U' : '◈'}
                </div>
                <div className="message-body">
                  <div className="message-label">
                    {msg.role === 'user' ? 'You' : 'Assistant'}
                    {msg.model && <span className="model-tag">{msg.model}</span>}
                  </div>
                  <div className="message-content">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                  {msg.sources && msg.sources.length > 0 && (
                    <SourcesAccordion sources={msg.sources} chunksUsed={msg.chunksUsed} />
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="message message-assistant">
                <div className="message-avatar">◈</div>
                <div className="message-body">
                  <div className="message-label">Assistant</div>
                  <div className="thinking">
                    <span className="thinking-dot" style={{ animationDelay: '0ms' }} />
                    <span className="thinking-dot" style={{ animationDelay: '200ms' }} />
                    <span className="thinking-dot" style={{ animationDelay: '400ms' }} />
                    <span className="thinking-text">Searching knowledge base...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="input-area">
        <div className="input-wrapper">
          <textarea
            ref={inputRef}
            className="chat-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your documents..."
            rows={1}
            disabled={loading}
          />
          <button
            className={`send-btn ${input.trim() && !loading ? 'active' : ''}`}
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
          >
            ➤
          </button>
        </div>
        <div className="input-hint">Enter to send · Shift+Enter for new line</div>
      </div>
    </div>
  )
}

function SourcesAccordion({ sources, chunksUsed }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="sources-accordion">
      <button className="sources-toggle" onClick={() => setOpen(!open)}>
        🔍 {chunksUsed} source chunk{chunksUsed !== 1 ? 's' : ''} retrieved
        <span className={`accordion-arrow ${open ? 'open' : ''}`}>▾</span>
      </button>
      {open && (
        <div className="sources-list">
          {sources.map((s, i) => (
            <div key={i} className="source-item">
              <div className="source-header">
                <span className="source-file">{s.filename}</span>
                <span className="source-score">{(s.score * 100).toFixed(0)}% match</span>
              </div>
              <div className="source-preview">{s.content_preview}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}