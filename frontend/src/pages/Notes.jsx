import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { FileText, PenLine, AlertTriangle, Loader2 } from 'lucide-react'
import GlassSurface from '../components/ui/GlassSurface'
import ClickSpark from '../components/ui/ClickSpark'
import { generateNotes, summarizeNotes } from '../api'
import { useToast } from '../components/ui/Toast'

export default function Notes() {
  const { sessionId } = useOutletContext()
  const toast = useToast()
  const [topic, setTopic] = useState('General')
  const [mode, setMode] = useState('full') // 'full' or 'summary'

  const [loading, setLoading] = useState(false)
  const [notesData, setNotesData] = useState(null)
  const [error, setError] = useState(null)

  const handleGenerate = async (e) => {
    e?.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res =
        mode === 'summary'
          ? await summarizeNotes(sessionId, { topic })
          : await generateNotes(sessionId, { topic })
      setNotesData(res)
    } catch (err) {
      setError(err.message || 'Failed to generate study notes')
      toast.error(err.message || 'Failed to generate study notes')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen p-6 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
          <FileText size={22} className="text-accent" /> Structured Study Notes
        </h1>
        <p className="text-sm text-text-muted">
          Synthesize entire modules into comprehensive revision guides or quick summaries.
        </p>
      </div>

      {/* Control Panel */}
      <div className="card p-5 mb-8">
        <form onSubmit={handleGenerate} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-text-muted mb-1 uppercase tracking-wider">
              Topic / Module Name
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Unit 3: Neural Networks & Backpropagation"
              className="w-full bg-bg-base border border-border/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1 uppercase tracking-wider">
              Format
            </label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="w-full bg-bg-base border border-border/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
            >
              <option value="full">Detailed Notes (Full)</option>
              <option value="summary">1-Paragraph Summary</option>
            </select>
          </div>

          <div>
            <ClickSpark sparkColor="#A855F7">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-lg text-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                {loading ? 'Synthesizing...' : (<><PenLine size={14} /> Generate Notes</>)}
              </button>
            </ClickSpark>
          </div>
        </form>
      </div>

      {error && (
        <div className="p-4 mb-6 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle size={15} />
          {error}
        </div>
      )}

      {/* Notes Display Container */}
      {notesData && (
        <div className="w-full mb-12">
          <GlassSurface
            width="100%"
            height="auto"
            borderRadius={20}
            brightness={25}
            opacity={0.92}
            blur={12}
            className="p-8 flex flex-col gap-6 border-accent/30"
          >
            <div className="flex items-center justify-between border-b border-border/30 pb-4">
              <h2 className="text-xl font-bold text-white">{notesData.title}</h2>
              <span className="text-xs text-accent font-semibold bg-accent/10 px-3 py-1 rounded-full border border-accent/30">
                {mode === 'summary' ? 'Executive Summary' : 'Full Study Guide'}
              </span>
            </div>

            <div className="prose-benkyo">
              <ReactMarkdown>{notesData.content}</ReactMarkdown>
            </div>
          </GlassSurface>
        </div>
      )}

      {/* MED-6: Loading state */}
      {loading && !notesData && (
        <div className="w-full flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/30 flex items-center justify-center mx-auto mb-4">
            <Loader2 size={28} className="text-accent animate-spin" />
          </div>
          <p className="text-sm font-semibold text-white">Synthesizing study notes…</p>
          <p className="text-xs text-text-muted mt-1">AI is analyzing your uploaded material</p>
        </div>
      )}

      {!notesData && !loading && (
        <div className="my-16 text-center text-text-muted">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/30 flex items-center justify-center mx-auto mb-3 text-accent">
            <FileText size={28} />
          </div>
          <p className="text-sm font-semibold text-white">No notes generated yet</p>
          <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
            Specify a topic above to generate a complete markdown study guide with key definitions, formulas, and takeaways.
          </p>
        </div>
      )}
    </div>
  )
}
