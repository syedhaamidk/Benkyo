import { useNavigate } from 'react-router-dom'
import { MessageSquare, Puzzle, Layers, FileText, BarChart3, FolderOpen, Sparkles, ArrowRight, ChevronDown } from 'lucide-react'
import Particles from '../components/ui/Particles'
import GlassSurface from '../components/ui/GlassSurface'
import StarBorder from '../components/ui/StarBorder'
import GradientText from '../components/text-animations/GradientText'
import BlurText from '../components/text-animations/BlurText'
import ShinyText from '../components/text-animations/ShinyText'
import DecryptText from '../components/text-animations/DecryptText'

const FEATURES = [
  {
    icon: MessageSquare,
    title: 'AI-Powered Q&A',
    desc: 'Ask anything about your material. Answers come with cited sources so you always know where the information came from.',
  },
  {
    icon: Puzzle,
    title: 'Smart Quizzes',
    desc: 'Generate MCQ quizzes at easy, medium, or hard difficulty. Track what you get wrong and focus your revision.',
  },
  {
    icon: Layers,
    title: 'Flashcard Decks',
    desc: 'Automatically create spaced-repetition flashcards from your notes, slides, and textbooks.',
  },
  {
    icon: FileText,
    title: 'Structured Notes',
    desc: 'Get polished study notes with headings, key definitions, and a takeaways section — not just a summary.',
  },
  {
    icon: BarChart3,
    title: 'Weak-Topic Tracking',
    desc: 'See which topics you consistently miss and get targeted practice so nothing slips through the cracks.',
  },
  {
    icon: FolderOpen,
    title: 'Multi-Format Upload',
    desc: 'Upload PDFs, PowerPoint decks, Word docs, plain text, or even photos of handwritten notes.',
  },
]

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="relative min-h-screen bg-bg-base overflow-x-hidden">

      {/* ── Hero Section ─────────────────────────────────────────── */}
      {/*
        Parent must have an explicit height for GlassSurface to measure.
        Using height: 100vh ensures getBoundingClientRect() resolves at mount.
      */}
      <section
        className="relative flex items-center justify-center"
        style={{ height: '100vh' }}
      >
        {/* Particles background — absolute, behind everything */}
        <div className="absolute inset-0" style={{ zIndex: 0 }}>
          <Particles
            particleCount={220}
            particleSpread={12}
            speed={0.07}
            particleColors={['#A855F7', '#EC4899', '#6366F1', '#ffffff']}
            alphaParticles
            particleBaseSize={80}
            sizeRandomness={1.2}
            cameraDistance={22}
            className="w-full h-full"
          />
        </div>

        {/* GlassSurface hero panel — centered */}
        <div className="relative px-4 w-full flex justify-center" style={{ zIndex: 10 }}>
          <GlassSurface
            width="min(680px, 92vw)"
            height="auto"
            borderRadius={24}
            brightness={28}
            opacity={0.88}
            blur={14}
            distortionScale={-160}
            className="p-12 flex flex-col items-center text-center gap-6"
            style={{ minHeight: 360, width: 'min(680px, 92vw)' }}
          >
            {/* Badge */}
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-accent mb-1">
              <Sparkles size={12} />
              <ShinyText text="Beta" speed={4} className="text-accent text-xs font-bold tracking-widest" />
            </span>

            {/* Title */}
            <GradientText
              text="Benkyo"
              colors={['#A855F7', '#EC4899', '#A855F7', '#6366F1', '#A855F7']}
              animationSpeed={6}
              className="text-6xl font-extrabold leading-tight"
            />

            {/* Subheading */}
            <BlurText
              text="Upload your coursework. Ask questions, make quizzes, build flashcards — all powered by AI."
              delay={0.04}
              animateBy="words"
              direction="up"
              className="text-lg text-text-body max-w-md"
            />

            {/* CTA */}
            <StarBorder
              as="button"
              color="#A855F7"
              speed="5s"
              thickness={1.5}
              onClick={() => navigate('/app/chat')}
              className="mt-2 cursor-pointer"
              style={{ borderRadius: 12 }}
            >
              <span className="px-8 py-3 text-base font-semibold text-white flex items-center gap-1.5">
                Get Started <ArrowRight size={16} />
              </span>
            </StarBorder>

            {/* Groq + RAG badge */}
            <p className="text-text-muted text-xs mt-1">
              <DecryptText
                text="Powered by Groq + RAG"
                trigger="mount"
                speed={50}
                className="text-text-muted text-xs"
              />
            </p>
          </GlassSurface>
        </div>

        {/* Scroll hint */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-text-muted text-xs animate-pulse"
          style={{ zIndex: 10 }}
        >
          <span>scroll</span>
          <ChevronDown size={14} className="animate-bounce" />
        </div>
      </section>

      {/* ── Features Grid ────────────────────────────────────────── */}
      <section className="py-24 px-6 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-white mb-3">
          Everything you need to study smarter
        </h2>
        <p className="text-center text-text-muted mb-14 max-w-xl mx-auto">
          One place for all your study tools — no switching tabs, no juggling apps.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="card p-6 hover:border-accent/40 hover:-translate-y-1 transition-all duration-300 cursor-default"
            >
              <div className="mb-4 w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                <f.icon size={20} strokeWidth={2} />
              </div>
              <h3 className="text-white font-semibold mb-2">{f.title}</h3>
              <p className="text-text-muted text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t border-border py-8 text-center text-text-muted text-sm">
        <p>Benkyo · Built with FastAPI, React, FAISS & Groq</p>
      </footer>
    </div>
  )
}
