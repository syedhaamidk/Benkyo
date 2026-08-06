import { useState, useRef, useEffect, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { Upload, FileText, MessageSquare, Loader2, AlertTriangle, Lightbulb, SendHorizontal } from 'lucide-react'
import GlassSurface from '../components/ui/GlassSurface'
import TypewriterText from '../components/text-animations/TypewriterText'
import ShinyText from '../components/text-animations/ShinyText'
import { useToast } from '../components/ui/Toast'
import { uploadFiles, ask } from '../api'

let _msgCounter = 0
const nextMsgId = () => `msg_${Date.now()}_${++_msgCounter}`

const PROMPT_EXAMPLES = [
  'Ask a question about your uploaded notes...',
  'Compare concepts across two lectures...',
  'Explain key terms in plain English...',
  'Summarize the core arguments in document #1...',
]

export default function Chat() {
  const { sessionId } = useOutletContext()
  const toast = useToast()
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedDocs, setUploadedDocs] = useState([])
  const [dragActive, setDragActive] = useState(false)

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState([])
  const [error, setError] = useState(null)

  const chatEndRef = useRef(null)

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // PERF-7: Only scroll when messages array changes, not on loading toggle
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Handle file drop / select
  const handleUpload = async (fileList) => {
    if (!fileList || fileList.length === 0) return
    const fileArray = Array.from(fileList)
    setUploading(true)
    setUploadProgress(0)
    setError(null)

    try {
      const res = await uploadFiles(fileArray, sessionId, (pct) => setUploadProgress(pct))
      setUploadedDocs((prev) => [...prev, ...res.documents])
    } catch (err) {
      setError(err.message || 'Upload failed')
      toast.error(err.message || 'Upload failed')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleSend = async (e) => {
    e?.preventDefault()
    if (!input.trim() || loading) return

    const userQ = input.trim()
    setInput('')
    setError(null)

    // Build history from current messages
    const history = messages.map((m) => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text,
    }))

    const newMsg = { id: nextMsgId(), sender: 'user', text: userQ }
    setMessages((prev) => [...prev, newMsg])
    setLoading(true)

    try {
      const res = await ask(userQ, sessionId, history)
      const aiMsg = {
        id: nextMsgId(),
        sender: 'ai',
        text: res.answer,
        sources: res.sources || [],
      }
      setMessages((prev) => [...prev, aiMsg])
    } catch (err) {
      setError(err.message || 'Failed to get answer')
      toast.error(err.message || 'Failed to get answer')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full max-w-2xl mx-auto overflow-hidden p-4 gap-4">
      {/* ── Left Sidebar: Document Manager ──────────────────────── */}
      <div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-4">
        {/* Upload Box */}
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload course material — click or drag files here"
          className={`card p-5 border-dashed border-2 transition-colors flex flex-col items-center justify-center text-center cursor-pointer ${
            dragActive ? 'border-accent bg-accent/10' : 'border-border/60 hover:border-accent/40'
          }`}
          onDragOver={(e) => {
            e.preventDefault()
            setDragActive(true)
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragActive(false)
            handleUpload(e.dataTransfer.files)
          }}
          onClick={() => {
            const fileInput = document.createElement('input')
            fileInput.type = 'file'
            fileInput.multiple = true
            fileInput.accept = '.pdf,.pptx,.docx,.txt,.md,.png,.jpg,.jpeg,.webp'
            fileInput.onchange = (ev) => handleUpload(ev.target.files)
            fileInput.click()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              e.currentTarget.click()
            }
          }}
        >
          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent mb-2">
            <Upload size={18} />
          </div>
          <p className="text-sm font-semibold text-white mb-1">
            {uploading ? 'Processing files...' : 'Upload Course Material'}
          </p>
          <p className="text-xs text-text-muted mb-2">
            PDF, PPTX, DOCX, TXT, MD, or images
          </p>

          {uploading ? (
            <div className="w-full mt-2">
              <div className="w-full bg-bg-base rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-accent h-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              {/* MED-2: Show processing state after upload completes */}
              {uploadProgress >= 100 && (
                <p className="text-[10px] text-accent text-center mt-1 animate-pulse">
                  Extracting text & building vector index…
                </p>
              )}
            </div>
          ) : (
            <span className="text-[11px] text-accent border border-accent/30 rounded px-2 py-0.5">
              Drag & Drop or Click
            </span>
          )}
        </div>

        {/* Uploaded Documents List */}
        <div className="card p-4 flex-1 flex flex-col min-h-[200px]">
          <div className="flex items-center justify-between mb-3 border-b border-border/40 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Uploaded Material ({uploadedDocs.length})
            </h3>
            {uploadedDocs.length > 0 && (
              <span className="text-[10px] text-green-400 font-medium">● Vectorized</span>
            )}
          </div>

          {uploadedDocs.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-text-muted text-xs">
              <p>No documents uploaded yet.</p>
              <p className="mt-1 text-[11px]">Upload PDF or PPTX files to start asking questions.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {uploadedDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="p-2.5 rounded-lg bg-bg-base/60 border border-border/30 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText size={14} className="text-accent flex-shrink-0" />
                    <span className="text-white font-medium truncate" title={doc.filename}>
                      {doc.filename}
                    </span>
                  </div>
                  <span className="text-[10px] text-text-muted bg-bg-card px-1.5 py-0.5 rounded flex-shrink-0">
                    {doc.chunk_count} chunks
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Main Chat Container ──────────────────────────────────── */}
      {/*
        Parent container has an explicit height: calc(100vh - 2rem) for GlassSurface
      */}
      <div className="flex-1 flex flex-col h-full min-w-0" style={{ height: 'calc(100vh - 2rem)' }}>
        <GlassSurface
          width="100%"
          height="100%"
          borderRadius={20}
          brightness={30}
          opacity={0.92}
          blur={12}
          className="flex flex-col h-full overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-border/30 flex items-center justify-between flex-shrink-0 bg-bg-base/40">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Coursework Q&A Assistant
              </h2>
              <p className="text-xs text-text-muted">
                Ask questions about your uploaded material with inline citations
              </p>
            </div>
            {uploadedDocs.length > 0 && (
              <ShinyText text="RAG Active" className="text-xs font-semibold text-accent" />
            )}
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center text-text-muted my-auto py-12">
                <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/30 flex items-center justify-center text-accent mb-4">
                  <MessageSquare size={26} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">What are we studying today?</h3>
                <p className="text-xs text-text-muted max-w-sm">
                  Upload your syllabus, lecture slides, or notes on the left, then ask any question.
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-accent/90 text-white rounded-br-none shadow-lg'
                      : 'bg-bg-card/90 border border-border/50 text-white rounded-bl-none'
                  }`}
                >
                  <div className="prose-benkyo text-sm leading-relaxed">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                </div>

                {/* Sources section for AI responses */}
                {msg.sender === 'ai' && msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2.5 max-w-[85%] bg-bg-base/80 border border-border/40 rounded-xl p-3 text-xs">
                    <p className="font-semibold text-accent text-[11px] mb-1.5 uppercase tracking-wider">
                      Cited Sources ({msg.sources.length})
                    </p>
                    <div className="space-y-1.5">
                      {msg.sources.map((src, i) => (
                        <div key={i} className="bg-bg-card/60 rounded p-2 border border-border/20">
                          <div className="flex items-center justify-between text-[11px] font-medium text-white mb-1">
                            <span className="flex items-center gap-1">
                              <FileText size={11} className="text-accent" />
                              {src.filename}
                            </span>
                            <span className="text-text-muted">Page/Slide {src.page}</span>
                          </div>
                          <p className="text-[11px] text-text-muted italic line-clamp-2">
                            "{src.snippet}"
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-accent text-xs bg-bg-card/60 p-3 rounded-xl border border-border/30 w-fit">
                <Loader2 size={14} className="animate-spin" />
                Searching sources & generating response...
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-1.5">
                <AlertTriangle size={13} />
                {error}
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input Box Area */}
          <div className="p-4 border-t border-border/30 bg-bg-base/60 flex-shrink-0">
            {/* Typewriter text placeholder hint */}
            <div className="mb-2 text-xs text-text-muted flex items-center gap-1.5 px-1">
              <Lightbulb size={12} className="text-accent flex-shrink-0" />
              <TypewriterText text={PROMPT_EXAMPLES} speed={60} pause={2500} className="text-xs text-text-muted italic" />
            </div>

            <form onSubmit={handleSend} className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question about your study material..."
                className="flex-1 bg-bg-card/80 border border-border/60 rounded-xl px-4 py-3 text-sm text-white placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-medium px-5 py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Send
                <SendHorizontal size={15} />
              </button>
            </form>
          </div>
        </GlassSurface>
      </div>
    </div>
  )
}
