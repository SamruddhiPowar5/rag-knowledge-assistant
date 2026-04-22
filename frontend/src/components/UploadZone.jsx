import { useState, useCallback } from 'react'
import { uploadDocument } from '../api'
import './UploadZone.css'

export default function UploadZone({ onUploadComplete }) {
  const [dragging, setDragging] = useState(false)
  const [uploads, setUploads] = useState([])

  const processFiles = useCallback(async (files) => {
    const fileArray = Array.from(files)
    const validFiles = fileArray.filter(f => {
      const ext = f.name.split('.').pop().toLowerCase()
      return ['pdf', 'txt', 'md', 'csv'].includes(ext) && f.size <= 20 * 1024 * 1024
    })

    if (validFiles.length === 0) {
      alert('No valid files. Supported: PDF, TXT, MD, CSV (max 20MB)')
      return
    }

    const newUploads = validFiles.map(f => ({
      id: `${f.name}-${Date.now()}`,
      name: f.name,
      size: f.size,
      status: 'uploading',
      chunks: null,
      error: null,
    }))

    setUploads(prev => [...newUploads, ...prev])

    for (const file of validFiles) {
      const uploadId = newUploads.find(u => u.name === file.name)?.id
      try {
        const result = await uploadDocument(file)
        setUploads(prev => prev.map(u =>
          u.id === uploadId
            ? { ...u, status: 'success', chunks: result.chunks }
            : u
        ))
        onUploadComplete()
      } catch (err) {
        setUploads(prev => prev.map(u =>
          u.id === uploadId
            ? { ...u, status: 'error', error: err.message }
            : u
        ))
      }
    }
  }, [onUploadComplete])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    processFiles(e.dataTransfer.files)
  }, [processFiles])

  const onDragOver = (e) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)
  const onFileInput = (e) => {
    if (e.target.files) processFiles(e.target.files)
    e.target.value = ''
  }

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  return (
    <div className="upload-page">
      <div className="upload-header">
        <h1>Upload Documents</h1>
        <p>Supported formats: <span className="formats">PDF · TXT · Markdown · CSV</span></p>
      </div>

      <div
        className={`drop-zone ${dragging ? 'dragging' : ''}`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => document.getElementById('file-input').click()}
      >
        <input
          id="file-input"
          type="file"
          multiple
          accept=".pdf,.txt,.md,.csv"
          onChange={onFileInput}
          style={{ display: 'none' }}
        />
        <div className="drop-icon">📂</div>
        <div className="drop-title">
          {dragging ? 'Release to upload' : 'Drop files here or click to browse'}
        </div>
        <div className="drop-sub">Max 20MB per file</div>
        <div className="drop-formats">
          {['PDF', 'TXT', 'MD', 'CSV'].map(f => (
            <span key={f} className="format-badge">{f}</span>
          ))}
        </div>
      </div>

      {uploads.length > 0 && (
        <div className="uploads-list">
          <div className="uploads-header">
            <span>Upload History</span>
            <button className="clear-history" onClick={() => setUploads([])}>
              Clear all
            </button>
          </div>
          {uploads.map(upload => (
            <div key={upload.id} className={`upload-item upload-${upload.status}`}>
              <div className="upload-icon">
                {upload.status === 'uploading' && <span className="spinner" />}
                {upload.status === 'success' && <span className="icon-success">✓</span>}
                {upload.status === 'error' && <span className="icon-error">✕</span>}
              </div>
              <div className="upload-info">
                <div className="upload-name">{upload.name}</div>
                <div className="upload-meta">
                  {upload.status === 'uploading' && 'Processing...'}
                  {upload.status === 'success' && `${upload.chunks} chunks indexed · ${formatSize(upload.size)}`}
                  {upload.status === 'error' && <span className="error-msg">{upload.error}</span>}
                </div>
              </div>
              <button className="upload-remove" onClick={() => setUploads(prev => prev.filter(u => u.id !== upload.id))}>×</button>
            </div>
          ))}
        </div>
      )}

      <div className="upload-tips">
        <div className="tips-title">Tips for better results</div>
        <div className="tips-grid">
          <div className="tip-card">
            <div className="tip-icon">⬛</div>
            <div className="tip-text"><strong>PDFs</strong> — Works best with text-based PDFs. Scanned images may have reduced accuracy.</div>
          </div>
          <div className="tip-card">
            <div className="tip-icon">◧</div>
            <div className="tip-text"><strong>CSV</strong> — Each row becomes a knowledge chunk. Use descriptive headers.</div>
          </div>
          <div className="tip-card">
            <div className="tip-icon">◈</div>
            <div className="tip-text"><strong>Markdown</strong> — Great for structured docs. Headers help chunk boundaries.</div>
          </div>
          <div className="tip-card">
            <div className="tip-icon">◻</div>
            <div className="tip-text"><strong>TXT</strong> — Plain text is split into chunks automatically.</div>
          </div>
        </div>
      </div>
    </div>
  )
}