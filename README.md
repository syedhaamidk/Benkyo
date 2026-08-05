# Benkyo (勉強) — AI Study Assistant

**Benkyo** is a web application that enables students to upload coursework material (PDFs, PPTX, DOCX, TXT, MD, images) and interact with it using AI:
- **Coursework Q&A**: Ask questions and get answers with cited sources (filename + page + snippet)
- **Interactive Quizzes**: Generate MCQ quizzes with adjustable difficulty & topic tags
- **Active Recall Flashcards**: Generate 3D flip card decks from notes and slides
- **Structured Notes**: Generate full markdown study guides with core concepts, definitions, and takeaways
- **Weak Topic Analytics**: Track quiz scores over time and pinpoint weak topics (<60% accuracy) for targeted revision

---

## Tech Stack

- **Backend**: FastAPI, SQLAlchemy (SQLite), PyMuPDF (`fitz`), `python-pptx`, `python-docx`, `pytesseract`
- **Vector Store & Embeddings**: FAISS (in-memory per session with disk persistence), `sentence-transformers` (`all-MiniLM-L6-v2`)
- **LLM**: Groq API (`llama-3.3-70b-versatile` for text RAG & generation, `whisper-large-v3` for voice input)
- **Frontend**: React (Vite), Tailwind CSS, `recharts`, `react-markdown`
- **Custom UI Library**: GlassSurface (SVG displacement), Particles (WebGL), LineSidebar, StarBorder, ClickSpark, ShinyText, DecryptText, WaveText, GradientText, BlurText, SplitText, TypewriterText

---

## File Structure

```
Benkyo/
├── backend/
│   ├── main.py                 # FastAPI entrypoint & CORS setup
│   ├── database.py             # SQLite engine & session setup
│   ├── models.py               # ORM models (Document, Chunk, QuizResult, FlashcardDeck)
│   ├── requirements.txt
│   ├── routers/
│   │   ├── upload.py           # Multi-format upload + extraction + vector indexing
│   │   ├── chat.py             # RAG Q&A endpoint with citations
│   │   ├── quiz.py             # MCQ quiz generation & scoring
│   │   ├── flashcards.py       # Flashcard deck generation
│   │   ├── notes.py            # Structured study notes & summaries
│   │   └── progress.py         # Weak topics & stats tracking
│   └── services/
│       ├── extractors.py       # PDF, PPTX, DOCX, TXT, OCR text extractors
│       ├── chunking.py         # 500-token chunker with overlap
│       ├── embeddings.py       # sentence-transformers singleton wrapper
│       ├── vector_store.py     # FAISS per-session index & persistence
│       └── groq_client.py      # Groq SDK client wrapper
├── frontend/
│   ├── src/
│   │   ├── api/index.js        # Backend fetch & upload wrappers
│   │   ├── components/
│   │   │   ├── text-animations/# ShinyText, DecryptText, WaveText, SplitText, etc.
│   │   │   └── ui/             # GlassSurface, Particles, LineSidebar, StarBorder, ClickSpark
│   │   ├── pages/
│   │   │   ├── Landing.jsx     # Hero landing page
│   │   │   ├── AppShell.jsx    # Sidebar navigation layout
│   │   │   ├── Chat.jsx        # Q&A interface with source citations
│   │   │   ├── Quiz.jsx        # Quiz generator & score reveal
│   │   │   ├── Flashcards.jsx  # 3D card flip active recall interface
│   │   │   ├── Notes.jsx       # Markdown study guide viewer
│   │   │   └── Progress.jsx    # Analytics dashboard & weak topics
│   │   ├── App.jsx             # React Router setup
│   │   ├── main.jsx
│   │   └── index.css
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
└── README.md
```

---

## Local Setup Instructions

### 1. Backend Setup

```bash
cd backend

# Create .env file with your Groq API Key
cp .env.example .env
# Edit .env and set: GROQ_API_KEY=your_groq_key_here

# Install dependencies
python -m pip install -r requirements.txt

# Start FastAPI dev server
uvicorn main:app --reload --port 8000
```

FastAPI Interactive Documentation will be available at: [http://localhost:8000/docs](http://localhost:8000/docs)

### 2. Frontend Setup

```bash
cd frontend

# Install npm dependencies
npm install

# Start Vite dev server
npm run dev
```

App will be available at: [http://localhost:5173](http://localhost:5173)

---

## Deployment Notes & Known Limitations

- **Render / Railway Free Tiers**: On free hosting tiers, container filesystems are ephemeral. The `data/faiss/` index directory will reset when containers restart unless a persistent volume (e.g. Render Persistent Disk) is attached.
- **Tesseract OCR**: Image OCR requires the `tesseract` OS binary installed. If Tesseract is not installed on the system, Benkyo gracefully skips image OCR while remaining fully functional for standard text PDFs, PPTX, DOCX, and text files.
