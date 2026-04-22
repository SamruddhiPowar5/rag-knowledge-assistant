const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function uploadDocument(file) {
  const formData = new FormData()
  formData.append('file', file)
  const response = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    body: formData,
  })
  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.detail || 'Upload failed')
  }
  return response.json()
}

export async function queryKnowledge(query, topK = 5, conversationHistory = []) {
  const response = await fetch(`${BASE_URL}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      top_k: topK,
      conversation_history: conversationHistory,
    }),
  })
  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.detail || 'Query failed')
  }
  return response.json()
}

export async function listDocuments() {
  const response = await fetch(`${BASE_URL}/documents`)
  if (!response.ok) throw new Error('Failed to fetch documents')
  return response.json()
}

export async function deleteDocument(documentId) {
  const response = await fetch(`${BASE_URL}/documents/${documentId}`, {
    method: 'DELETE',
  })
  if (!response.ok) throw new Error('Failed to delete document')
  return response.json()
}

export async function getStats() {
  const response = await fetch(`${BASE_URL}/stats`)
  if (!response.ok) throw new Error('Failed to fetch stats')
  return response.json()
}