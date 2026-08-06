import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Layers, Sparkles, AlertTriangle, RotateCw, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import GlassSurface from '../components/ui/GlassSurface'
import ClickSpark from '../components/ui/ClickSpark'
import { generateFlashcards } from '../api'
import { useToast } from '../components/ui/Toast'

export default function Flashcards() {
  const { sessionId } = useOutletContext()
  const toast = useToast()
  const [topic, setTopic] = useState('General')
  const [count, setCount] = useState(8)

  const [loading, setLoading] = useState(false)
  const [cards, setCards] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [error, setError] = useState(null)

  const handleGenerate = async (e) => {
    e?.preventDefault()
    setLoading(true)
    setError(null)
    setCards([])
    setCurrentIndex(0)
    setIsFlipped(false)

    try {
      const res = await generateFlashcards(sessionId, { topic, count })
      setCards(res)
    } catch (err) {
      setError(err.message || 'Failed to generate flashcards')
      toast.error(err.message || 'Failed to generate flashcards')
    } finally {
      setLoading(false)
    }
  }

  const currentCard = cards[currentIndex]

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setIsFlipped(false)
      setCurrentIndex((prev) => prev + 1)
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setIsFlipped(false)
      setCurrentIndex((prev) => prev - 1)
    }
  }

  return (
    <div className="flex flex-col min-h-screen p-6 max-w-4xl mx-auto w-full items-center">
      {/* Header */}
      <div className="w-full mb-6">
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
          <Layers size={22} className="text-accent" /> Active Recall Flashcards
        </h1>
        <p className="text-sm text-text-muted">
          Master definitions, key theorems, and formulas with interactive flip cards.
        </p>
      </div>

      {/* Control Panel */}
      <div className="card p-5 mb-8 w-full">
        <form onSubmit={handleGenerate} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1 uppercase tracking-wider">
              Topic / Chapter
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Organic Chemistry"
              className="w-full bg-bg-base border border-border/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1 uppercase tracking-wider">
              Card Count ({count})
            </label>
            <input
              type="range"
              min="2"
              max="15"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full accent-accent cursor-pointer py-2"
            />
          </div>

          <div>
            <ClickSpark sparkColor="#A855F7">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-lg text-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                {loading ? 'Building Deck...' : (<><Sparkles size={14} /> Generate Deck</>)}
              </button>
            </ClickSpark>
          </div>
        </form>
      </div>

      {error && (
        <div className="w-full p-4 mb-6 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle size={15} />
          {error}
        </div>
      )}

      {/* Main Flashcard Container */}
      {cards.length > 0 && currentCard && (
        <div className="w-full max-w-lg flex flex-col items-center gap-6 my-4">
          {/* Card Counter */}
          <div className="text-xs text-text-muted font-mono uppercase tracking-widest bg-bg-card px-3 py-1 rounded-full border border-border/40">
            Card {currentIndex + 1} of {cards.length}
          </div>

          {/* 3D Flip Card Area */}
          <div
            className="w-full cursor-pointer select-none"
            style={{ perspective: 1000, height: 320 }}
            role="button"
            tabIndex={0}
            aria-label={isFlipped ? 'Flip card to show question' : 'Flip card to show answer'}
            onClick={() => setIsFlipped(!isFlipped)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setIsFlipped(!isFlipped)
              }
            }}
          >
            <div
              className={`relative w-full h-full transition-transform duration-500 transform-gpu ${
                isFlipped ? '[transform:rotateY(180deg)]' : ''
              }`}
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* FRONT */}
              <div
                className="absolute inset-0 w-full h-full [backface-visibility:hidden]"
                style={{ height: 320 }}
              >
                <GlassSurface
                  width="100%"
                  height="100%"
                  borderRadius={24}
                  brightness={35}
                  opacity={0.93}
                  blur={12}
                  className="p-8 flex flex-col justify-between items-center text-center h-full border-accent/40"
                  style={{ height: '100%' }}
                >
                  <span className="text-xs font-bold text-accent uppercase tracking-wider bg-accent/10 px-3 py-1 rounded-full border border-accent/20">
                    {currentCard.category || 'Front / Question'}
                  </span>

                  <p className="text-xl font-bold text-white leading-snug px-4 my-auto">
                    {currentCard.front}
                  </p>

                  <span className="text-xs text-text-muted flex items-center gap-1 animate-pulse">
                    <RotateCw size={12} /> Click to reveal answer
                  </span>
                </GlassSurface>
              </div>

              {/* BACK */}
              <div
                className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)]"
                style={{ height: 320 }}
              >
                <GlassSurface
                  width="100%"
                  height="100%"
                  borderRadius={24}
                  brightness={20}
                  opacity={0.95}
                  blur={14}
                  className="p-8 flex flex-col justify-between items-center text-center h-full border-green-500/40"
                  style={{ height: '100%' }}
                >
                  <span className="text-xs font-bold text-green-400 uppercase tracking-wider bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                    Answer / Definition
                  </span>

                  <p className="text-base text-white leading-relaxed px-4 my-auto">
                    {currentCard.back}
                  </p>

                  <span className="text-xs text-text-muted flex items-center gap-1">
                    <RotateCw size={12} /> Click to flip back
                  </span>
                </GlassSurface>
              </div>
            </div>
          </div>

          {/* Deck Controls */}
          <div className="flex items-center gap-4 mt-2">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="bg-bg-card hover:bg-bg-card/80 disabled:opacity-30 text-white px-5 py-2.5 rounded-xl border border-border/50 text-sm font-semibold transition-colors cursor-pointer flex items-center gap-1"
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <button
              onClick={() => setIsFlipped(!isFlipped)}
              className="bg-accent/20 hover:bg-accent/30 text-accent border border-accent/40 px-6 py-2.5 rounded-xl text-sm font-bold transition-colors cursor-pointer"
            >
              Flip Card
            </button>
            <button
              onClick={handleNext}
              disabled={currentIndex === cards.length - 1}
              className="bg-black/20 hover:bg-black/40 disabled:opacity-30 text-white px-5 py-2.5 rounded-xl border border-gray-700 text-sm font-semibold transition-colors cursor-pointer flex items-center gap-1"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* MED-6: Loading state */}
      {loading && !cards.length && (
        <div className="w-full flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/30 flex items-center justify-center mx-auto mb-4">
            <Loader2 size={28} className="text-accent animate-spin" />
          </div>
          <p className="text-sm font-semibold text-white">Building your flashcard deck…</p>
          <p className="text-xs text-text-muted mt-1">AI is generating cards from your study material</p>
        </div>
      )}

      {/* Empty State */}
      {!cards.length && !loading && (
        <div className="my-16 text-center text-text-muted">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/30 flex items-center justify-center mx-auto mb-3 text-accent">
            <Layers size={28} />
          </div>
          <p className="text-sm font-semibold text-white">No flashcards generated yet</p>
          <p className="text-xs text-text-muted mt-1 max-w-sm">
            Enter a topic above and click Generate Deck to extract active recall cards from your uploaded material.
          </p>
        </div>
      )}
    </div>
  )
}
