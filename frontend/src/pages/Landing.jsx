import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Particles from '../components/ui/Particles';
import GlassSurface from '../components/ui/GlassSurface';
import HeroFloatingCards from '../components/ui/HeroFloatingCards';

import BlurText from '../components/text-animations/BlurText';

// Minimal feature data
const FEATURES = [
  { title: 'AI‑Powered Q&A', desc: 'Ask anything, get sourced answers.' },
  { title: 'Smart Quizzes', desc: 'Generate quizzes at any difficulty.' },
  { title: 'Flashcard Decks', desc: 'Create spaced‑repetition flashcards.' },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen bg-bg-base overflow-x-hidden font-sans">
      {/* Hero Section */}
      <section className="relative flex items-center justify-center" style={{ height: '100vh' }}>
        {/* Particles background — tuned up from defaults so the ambient field
            is actually visible (was near-invisible at the original size/alpha) */}
        <div className="absolute inset-0 z-0">
          <Particles
            particleCount={140}
            particleSpread={12}
            speed={0.08}
            particleColors={['#A855F7', '#EC4899', '#6366F1', '#ffffff']}
            alphaParticles
            particleBaseSize={170}
            sizeRandomness={1.4}
            cameraDistance={18}
            moveParticlesOnHover
            particleHoverFactor={0.6}
            className="w-full h-full"
          />
        </div>

        {/* Floating cards illustrating the upload → AI → quiz pipeline */}
        <HeroFloatingCards />

        {/* GlassSurface hero panel */}
        <div className="relative z-10 w-full flex justify-center px-4">
          <GlassSurface
            width="min(680px, 92vw)"
            height="auto"
            borderRadius={24}
            brightness={28}
            opacity={0.88}
            blur={18}
            backgroundOpacity={0.05}
            distortionScale={-160}
            className="p-8 md:p-12 flex flex-col items-center text-center gap-4"
            style={{ minHeight: 300, width: 'min(680px, 92vw)' }}
          >
            {/* Title */}
            <h1 className="gradient-text font-display text-5xl md:text-6xl font-extrabold leading-none">Benkyo</h1>

            {/* Subheading */}
            <BlurText
              text="Study with AI. Not harder. Smarter."
              delay={0.04}
              animateBy="words"
              direction="up"
              className="text-lg text-text max-w-md"
            />

            {/* Primary CTA */}
            <button
              onClick={() => navigate('/app/chat')}
              className="btn-primary mt-4 px-8 py-3 text-base flex items-center gap-1.5 cursor-pointer"
            >
              Upload Notes <ArrowRight size={16} />
            </button>
          </GlassSurface>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="py-16 px-6 max-w-4xl mx-auto">
        <h2 className="font-display text-3xl font-bold text-center text-white mb-4">
          Everything you need to study smarter
        </h2>
        <p className="text-center text-text-muted mb-8 max-w-xl mx-auto">
          Upload PDFs, DOCX, PPTX, TXT, Markdown, Images and let AI power your study workflow.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                e.currentTarget.style.setProperty('--mx', `${e.clientX - rect.left}px`)
                e.currentTarget.style.setProperty('--my', `${e.clientY - rect.top}px`)
              }}
              className="card spotlight-card p-6 hover:border-accent/40 hover:-translate-y-1 transition-all duration-300"
            >
              <h3 className="text-white font-semibold mb-2 text-lg">{f.title}</h3>
              <p className="text-text-muted text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-text-muted text-sm">
        <p>Benkyo · Built with FastAPI, React, FAISS & Groq</p>
      </footer>
    </div>
  );
}
