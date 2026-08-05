import { useState, useEffect } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { BarChart3, RefreshCw, AlertTriangle, TrendingUp, Target, ChevronRight } from 'lucide-react'
import GlassSurface from '../components/ui/GlassSurface'
import ShinyText from '../components/text-animations/ShinyText'
import { getWeakTopics, getStats } from '../api'
import { useToast } from '../components/ui/Toast'

export default function Progress() {
  const { sessionId } = useOutletContext()
  const toast = useToast()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [weakTopics, setWeakTopics] = useState([])
  const [stats, setStats] = useState({ history: [], overall_accuracy: 0, total_questions: 0 })
  const [error, setError] = useState(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [weakRes, statsRes] = await Promise.all([
        getWeakTopics(sessionId),
        getStats(sessionId),
      ])
      setWeakTopics(weakRes.weak_topics || [])
      setStats(statsRes)
    } catch (err) {
      setError(err.message || 'Failed to load progress data')
      toast.error(err.message || 'Failed to load progress data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [sessionId])

  const handlePracticeTopic = (topicName) => {
    navigate(`/app/quiz?topic=${encodeURIComponent(topicName)}`)
  }

  return (
    <div className="flex flex-col min-h-screen p-6 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <BarChart3 size={22} className="text-accent" /> Weak Topics & Learning Analytics
          </h1>
          <p className="text-sm text-text-muted">
            Track quiz scores over time and target the exact concepts where you need practice.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="text-xs bg-bg-card border border-border/50 hover:border-accent/40 text-text-muted hover:text-white px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 mb-6 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle size={15} />
          {error}
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="card p-5 flex flex-col justify-between">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Overall Accuracy</span>
          <div className="text-3xl font-extrabold text-white mt-2 mb-1">
            {stats.overall_accuracy}%
          </div>
          <span className="text-[11px] text-text-muted">Across all quiz attempts</span>
        </div>

        <div className="card p-5 flex flex-col justify-between">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Questions Attempted</span>
          <div className="text-3xl font-extrabold text-accent mt-2 mb-1">
            {stats.total_questions}
          </div>
          <span className="text-[11px] text-text-muted">Logged in database</span>
        </div>

        <div className="card p-5 flex flex-col justify-between">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Weak Topics Flagged</span>
          <div className="text-3xl font-extrabold text-pink-500 mt-2 mb-1">
            {weakTopics.filter((t) => t.status === 'Needs Review').length}
          </div>
          <span className="text-[11px] text-text-muted">Accuracy below 60%</span>
        </div>
      </div>

      {/* Main Grid: Chart + Weak Topics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
        {/* Performance Chart */}
        <div className="w-full" style={{ minHeight: 340 }}>
          <GlassSurface
            width="100%"
            height="100%"
            borderRadius={20}
            brightness={25}
            opacity={0.92}
            blur={10}
            className="p-6 flex flex-col gap-4 h-full"
            style={{ height: '100%' }}
          >
            <h3 className="text-base font-bold text-white flex items-center justify-between border-b border-border/30 pb-3">
              <span className="flex items-center gap-1.5"><TrendingUp size={16} className="text-accent" /> Quiz Score Progression</span>
              <ShinyText text="Live Data" className="text-xs text-accent" />
            </h3>

            {loading ? (
              <div className="flex-1 w-full h-64 pt-2 flex flex-col justify-end gap-2 px-2 pb-4">
                <div className="flex items-end gap-3 h-full">
                  {[40, 65, 50, 80, 60, 90, 70].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-bg-card/80 rounded-t-md animate-pulse"
                      style={{ height: `${h}%`, animationDelay: `${i * 0.08}s` }}
                    />
                  ))}
                </div>
                <div className="h-px w-full bg-border/40" />
              </div>
            ) : stats.history.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-text-muted text-xs p-6">
                <p>No quiz history recorded yet.</p>
                <p className="mt-1">Complete a quiz in Quiz Mode to start charting your progress!</p>
              </div>
            ) : (
              <div className="flex-1 w-full h-64 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262035" />
                    <XAxis dataKey="timestamp" stroke="#8b8f9a" tick={{ fontSize: 10, fill: "#8b8f9a" }} />
                    <YAxis domain={[0, 100]} stroke="#8b8f9a" tick={{ fontSize: 10, fill: "#8b8f9a" }} unit="%" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1a1625', borderColor: '#A855F7', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff', fontSize: '12px' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="quiz_score_pct"
                      name="Score %"
                      stroke="#A855F7"
                      strokeWidth={3}
                      dot={{ r: 5, fill: '#EC4899' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </GlassSurface>
        </div>

        {/* Weak Topics Panel */}
        <div className="w-full" style={{ minHeight: 340 }}>
          <GlassSurface
            width="100%"
            height="100%"
            borderRadius={20}
            brightness={25}
            opacity={0.92}
            blur={10}
            className="p-6 flex flex-col gap-4 h-full"
            style={{ height: '100%' }}
          >
            <h3 className="text-base font-bold text-white border-b border-border/30 pb-3 flex items-center gap-1.5">
              <Target size={16} className="text-accent" /> Topic Accuracy Breakdown
            </h3>

            {weakTopics.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-text-muted text-xs p-6">
                <p>No weak topics flagged yet.</p>
                <p className="mt-1">Keep completing quizzes to generate topic recommendations.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {weakTopics.map((t, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-xl bg-bg-base/70 border border-border/40 flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{t.topic}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            t.status === 'Needs Review'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-green-500/20 text-green-400 border border-green-500/30'
                          }`}
                        >
                          {t.status}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted mt-1">
                        {t.accuracy_pct}% accuracy ({t.incorrect_count} incorrect out of {t.total_questions})
                      </p>
                    </div>

                    <button
                      onClick={() => handlePracticeTopic(t.topic)}
                      className="bg-accent/20 hover:bg-accent/30 text-accent border border-accent/40 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex-shrink-0 flex items-center gap-1"
                    >
                      Practice <ChevronRight size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </GlassSurface>
        </div>
      </div>
    </div>
  )
}
