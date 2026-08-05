import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ToastProvider } from './components/ui/Toast'
import Landing from './pages/Landing'
import AppShell from './pages/AppShell'
import Chat from './pages/Chat'
import Quiz from './pages/Quiz'
import Flashcards from './pages/Flashcards'
import Notes from './pages/Notes'
import Progress from './pages/Progress'

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
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
      </BrowserRouter>
    </ToastProvider>
  )
}
