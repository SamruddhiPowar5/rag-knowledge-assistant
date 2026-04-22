import { useState } from 'react'
import { deleteDocument } from '../api'
import './Sidebar.css'

export default function Sidebar({ documents, stats, activeView, setActiveView, onDocumentDeleted }) {
  const [deletingId, setDeletingId] = useState(null)

  const handleDelete = async (docId, e) => {
    e.stopPropagation()
    if (!confirm('Remove this document?')) return
    setDeletingId(docId)
    try {
      await deleteDocument(docId)
      await onDocumentDeleted()
    } catch (err) {
      alert('Failed to delete document')
    } finally {
      setDeletingId(null)
    }
  }

  const fileIcon = (filename) => {
    const ext = filename?.split('.').pop()?.toLowerCase()
    const icons = { pdf: '⬛', csv: '◧', txt: '◻', md: '◈' }
    return icons[ext] || '◻'
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <div className="logo-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L3 7v10l9 5 9-5V7L12 2z" stroke="var(--accent)" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M12 22V12M3 7l9 5 9-5" stroke="var(--accent)" strokeWidth="1.5"/>
            </svg>
          </div>
          <div>
            <div className="logo-name">KnowledgeAI</div>
            <div className="logo-sub">RAG Assistant</div>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <button
          className={`nav-btn ${activeView === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveView('chat')}
        >
          💬 Ask Questions
        </button>
        <button
          className={`nav-btn ${activeView === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveView('upload')}
        >
          📁 Upload Docs
        </button>
      </nav>

      {stats && (
        <div className="stats-card">
          <div className="stats-label">Knowledge Base</div>
          <div className="stats-row">
            <span>{stats.total_vectors?.toLocaleString() || 0}</span>
            <span className="stats-unit">vectors indexed</span>
          </div>
          <div className="stats-row">
            <span>{documents.length}</span>
            <span className="stats-unit">documents</span>
          </div>
        </div>
      )}

      <div className="docs-section">
        <div className="docs-header">
          <span>Documents</span>
          <span className="docs-count">{documents.length}</span>
        </div>
        <div className="docs-list">
          {documents.length === 0 ? (
            <div className="docs-empty">
              No documents yet.<br />Upload files to get started.
            </div>
          ) : (
            documents.map(doc => (
              <div key={doc.document_id} className="doc-item">
                <span className="doc-icon">{fileIcon(doc.filename)}</span>
                <div className="doc-info">
                  <div className="doc-name" title={doc.filename}>{doc.filename}</div>
                  <div className="doc-meta">{doc.total_chunks} chunks</div>
                </div>
                <button
                  className="doc-delete"
                  onClick={(e) => handleDelete(doc.document_id, e)}
                  disabled={deletingId === doc.document_id}
                >
                  {deletingId === doc.document_id ? '⟳' : '×'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="sidebar-footer">
        <div className="powered-by">Powered by GPT-4o + Pinecone</div>
      </div>
    </aside>
  )
}