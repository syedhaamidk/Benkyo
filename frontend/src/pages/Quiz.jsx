import { useState, useEffect } from 'react'
import { useOutletContext, useSearchParams } from 'react-router-dom'
import { Puzzle, Zap, AlertTriangle, PartyPopper, ThumbsUp, Lightbulb } from 'lucide-react'
import GlassSurface from '../components/ui/GlassSurface'
import ClickSpark from '../components/ui/ClickSpark'
import SplitText from '../components/text-animations/SplitText'
import ShinyText from '../components/text-animations/ShinyText'
import { generateQuiz, submitQuiz } from '../api'
import { useToast } from '../components/ui/Toast'
import CountUp from '../components/ui/CountUp'
import ConfettiBurst from '../components/ui/ConfettiBurst'

export default function Quiz() {
  const { sessionId } = useOutletContext()
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const [topic, setTopic] = useState(searchParams.get('topic') || 'General')
  const [difficulty, setDifficulty] = useState('medium')
  const [count, setCount] = useState(5)

  const [loading, setLoading] = useState(false)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({}) // { questionId: selectedIndex }
  const [submitted, setSubmitted] = useState(false)
  const [scoreResult, setScoreResult] = useState(null)
  const [error, setError] = useState(null)

  const handleGenerate = async (e) => {
    e?.preventDefault()
    setLoading(true)
    setError(null)
    setSubmitted(false)
    setScoreResult(null)
    setAnswers({})

    try {
      const res = await generateQuiz(sessionId, { topic, difficulty, count })
      setQuestions(res)
    } catch (err) {
      setError(err.message || 'Failed to generate quiz')
      toast.error(err.message || 'Failed to generate quiz')
    } finally {
      setLoading(false)
    }
  }

  // Arrived via the Progress page's "Practice →" deep link (?topic=X) —
  // generate a quiz for that topic right away.
  // MED-5: Capture initial topic from search params to avoid stale closure
  useEffect(() => {
    const initialTopic = searchParams.get('topic')
    if (initialTopic) {
      // Use current state values at mount time
      const runInitialGenerate = async () => {
        setLoading(true)
        setError(null)
        try {
          const res = await generateQuiz(sessionId, { topic: initialTopic, difficulty, count })
          setQuestions(res)
        } catch (err) {
          setError(err.message || 'Failed to generate quiz')
          toast.error(err.message || 'Failed to generate quiz')
        } finally {
          setLoading(false)
        }
      }
      runInitialGenerate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSelectOption = (questionId, optionIdx) => {
    if (submitted) return
    setAnswers((prev) => ({ ...prev, [questionId]: optionIdx }))
  }

  const handleSubmitQuiz = async () => {
    if (submitted || questions.length === 0) return

    const results = questions.map((q) => {
      const userSelectedIdx = answers[q.id]
      const userSelectedText = userSelectedIdx !== undefined ? q.options[userSelectedIdx] : 'No Answer'
      const correctText = q.options[q.correct]
      const isCorrect = userSelectedIdx === q.correct
      return {
        question: q.question,
        topic_tag: q.topic_tag || topic,
        user_answer: userSelectedText,
        correct_answer: correctText,
        is_correct: isCorrect,
      }
    })

    const correctCount = results.filter((r) => r.is_correct).length
    const scorePct = Math.round((correctCount / questions.length) * 100)

    setSubmitted(true)
    setScoreResult({ correct: correctCount, total: questions.length, pct: scorePct })

    try {
      await submitQuiz(sessionId, results)
    } catch (err) {
      console.warn('Failed to record quiz submission:', err)
    }
  }

  return (
    <div className="flex flex-col min-h-screen p-6 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-extrabold text-white flex items-center gap-2">
          <Puzzle size={22} className="text-accent" /> Interactive Quiz Mode
        </h1>
        <p className="text-sm text-text-muted">
          Test your memory and identify weak areas across your coursework material.
        </p>
      </div>

      {/* Quiz Generator Controls */}
      <div className="card p-5 mb-8">
        <form onSubmit={handleGenerate} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1 uppercase tracking-wider">
              Topic / Focus
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Data Structures"
              className="w-full bg-bg-base border border-border/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1 uppercase tracking-wider">
              Difficulty
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full bg-bg-base border border-border/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1 uppercase tracking-wider">
              Questions ({count})
            </label>
            <input
              type="range"
              min="3"
              max="10"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full accent-accent cursor-pointer py-2"
            />
          </div>

          <div className="w-full">
            <ClickSpark sparkColor="#A855F7" sparkCount={10}>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-lg text-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                {loading ? 'Generating...' : (<><Zap size={14} /> Generate Quiz</>)}
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

      {/* Score Reveal Header */}
      {submitted && scoreResult && (
        <div className="relative mb-8 p-6 card border-accent/40 bg-accent/10 flex flex-col items-center justify-center text-center overflow-visible">
          {scoreResult.pct === 100 && <ConfettiBurst />}
          <span className="text-xs uppercase tracking-widest font-bold text-accent mb-1">Quiz Completed</span>
          <CountUp
            value={scoreResult.pct}
            suffix="%"
            duration={1200}
            className="font-display text-5xl font-extrabold text-white tabular-nums"
          />
          <SplitText
            text={`${scoreResult.correct}/${scoreResult.total} correct`}
            delay={0.03}
            className="text-sm text-text-muted mt-1"
          />
          <p className="text-xs text-text-muted mt-2 flex items-center gap-1.5">
            {scoreResult.pct === 100 ? (
              <><PartyPopper size={13} className="text-accent" /> Perfect score — this topic is locked in!</>
            ) : scoreResult.pct >= 80 ? (
              <><PartyPopper size={13} className="text-accent" /> Excellent mastery of this topic!</>
            ) : scoreResult.pct >= 60 ? (
              <><ThumbsUp size={13} className="text-accent" /> Good progress! Review the explanations below.</>
            ) : (
              <><AlertTriangle size={13} className="text-yellow-500" /> Topic flagged for review in your Progress tab.</>
            )}
          </p>
        </div>
      )}

      {/* Live progress bar while questions are still open */}
      {questions.length > 0 && !submitted && (
        <div className="mb-6 max-w-sm">
          <div className="flex justify-between text-[11px] font-semibold text-text-muted mb-1.5">
            <span>Answered</span>
            <span><span className="text-accent">{Object.keys(answers).length}</span> / {questions.length}</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-pink-500 transition-all duration-500 ease-out"
              style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Questions List */}
      <div className="space-y-6">
        {questions.map((q, qIdx) => (
          <div key={q.id || qIdx} className="w-full" style={{ minHeight: 220 }}>
            <GlassSurface
              width="100%"
              height="auto"
              borderRadius={16}
              brightness={25}
              opacity={0.9}
              blur={10}
              className="p-6 flex flex-col gap-4"
              style={{ minHeight: 220, width: '100%' }}
            >
              {/* Question Header with ShinyText topic badge */}
              <div className="flex items-center justify-between border-b border-border/30 pb-3">
                <span className="text-xs font-bold text-accent uppercase tracking-wider">
                  Question {qIdx + 1} of {questions.length}
                </span>
                <ShinyText
                  text={`# ${q.topic_tag || topic}`}
                  speed={4}
                  className="text-xs font-semibold text-accent/90 bg-accent/10 px-2.5 py-0.5 rounded-full border border-accent/30"
                />
              </div>

              {/* Question Text */}
              <h3 className="text-base font-semibold text-white leading-relaxed">
                {q.question}
              </h3>

              {/* Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                {q.options.map((opt, optIdx) => {
                  const isSelected = answers[q.id] === optIdx
                  const isCorrect = q.correct === optIdx

                  let btnStyle = 'bg-bg-base/70 border-border/50 text-text hover:border-accent/50'

                  if (submitted) {
                    if (isCorrect) {
                      btnStyle = 'bg-green-500/20 border-green-500/80 text-white font-semibold'
                    } else if (isSelected && !isCorrect) {
                      btnStyle = 'bg-red-500/20 border-red-500/80 text-red-200'
                    } else {
                      btnStyle = 'bg-bg-base/40 border-border/20 text-text-muted opacity-60'
                    }
                  } else if (isSelected) {
                    btnStyle = 'bg-accent/20 border-accent text-white font-semibold'
                  }

                  return (
                    <button
                      key={optIdx}
                      onClick={() => handleSelectOption(q.id, optIdx)}
                      className={`p-3.5 rounded-xl border text-left text-sm transition-all duration-200 cursor-pointer flex items-start gap-2.5 ${btnStyle}`}
                    >
                      <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span>{opt}</span>
                    </button>
                  )
                })}
              </div>

              {/* Explanation section on submit */}
              {submitted && (
                <div className="mt-3 p-3.5 bg-bg-base/80 border border-border/40 rounded-xl text-xs leading-relaxed">
                  <p className="font-semibold text-accent mb-1 flex items-center gap-1.5">
                    <Lightbulb size={13} /> Explanation:
                  </p>
                  <p className="text-text-muted">{q.explanation}</p>
                </div>
              )}
            </GlassSurface>
          </div>
        ))}
      </div>

      {/* Submit Button */}
      {questions.length > 0 && !submitted && (
        <div className="mt-8 flex justify-center">
          <ClickSpark sparkColor="#A855F7" sparkCount={12}>
            <button
              onClick={handleSubmitQuiz}
              disabled={Object.keys(answers).length < questions.length}
              className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-extrabold px-8 py-3.5 rounded-xl text-base shadow-lg transition-colors cursor-pointer"
            >
              Submit Quiz Answers ({Object.keys(answers).length}/{questions.length})
            </button>
          </ClickSpark>
        </div>
      )}
    </div>
  )
}
