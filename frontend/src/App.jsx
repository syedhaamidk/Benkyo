import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ToastProvider } from './components/ui/Toast'

// PERF-6: Lazy load page components to reduce initial bundle size
const Landing = lazy(() => import('./pages/Landing'))
const AppShell = lazy(() => import('./pages/AppShell'))
const Chat = lazy(() => import('./pages/Chat'))
const Quiz = lazy(() => import('./pages/Quiz'))
const Flashcards = lazy(() => import('./pages/Flashcards'))
const Notes = lazy(() => import('./pages/Notes'))
const Progress = lazy(() => import('./pages/Progress'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen w-screen bg-bg-base">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-accent/30 border-t-accent rounded-full animate-spin" />
        <span className="text-sm text-text-muted">Loading…</span>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/app" element={<AppShell />}>
              <Route index element={<Navigate to="chat" replace />} />
              <Route path="chat" element={<Chat />} />
              <Route path="quiz" element={<Quiz />} />
              <Route path="flashcards" element={<Flashcards />} />
              <Route path="notes" element={<Notes />} />
              <Route path="progress" element={<Progress />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ToastProvider>
  )
}
