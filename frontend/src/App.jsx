import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import ChatPanel from './components/ChatPanel'
import UploadZone from './components/UploadZone'
import { listDocuments, getStats } from './api'
import './App.css'

export default function App() {
  const [documents, setDocuments] = useState([])
  const [stats, setStats] = useState(null)
  const [activeView, setActiveView] = useState('chat')

  const refreshData = async () => {
    try {
      const [docsRes, statsRes] = await Promise.all([listDocuments(), getStats()])
      setDocuments(docsRes.documents || [])
      setStats(statsRes)
    } catch (e) {
      console.error('Failed to fetch data:', e)
    }
  }

  useEffect(() => { refreshData() }, [])

  return (
    <div className="app-shell">
      <Sidebar
        documents={documents}
        stats={stats}
        activeView={activeView}
        setActiveView={setActiveView}
        onDocumentDeleted={refreshData}
      />
      <main className="main-content">
        {activeView === 'chat'
          ? <ChatPanel documents={documents} />
          : <UploadZone onUploadComplete={refreshData} />
        }
      </main>
    </div>
  )
}