# Text Animation Components

All components follow the same pattern as `ShinyText`: plain props, a `disabled` flag to turn off animation, and a paired `.css` file. Copy the `.jsx` + `.css` pair you want directly into your project (e.g. `src/components/TextAnimations/`).

**Dependency required for all except `TypewriterText` and `DecryptText`:**
```bash
npm install motion
```
(`TypewriterText` and `DecryptText` are pure React/CSS — no extra dependency.)

---

## 1. GradientText
Flowing animated color gradient — great for hero titles.
```jsx
import GradientText from './GradientText';

<GradientText
  text="Study Smarter, Not Harder"
  colors={['#40ffaa', '#4079ff', '#40ffaa', '#40ffaa', '#4079ff']}
  speed={3}
/>
```

## 2. BlurText
Reveals word-by-word or letter-by-letter from blurred to sharp. Good for page intros / onboarding text.
```jsx
import BlurText from './BlurText';

<BlurText
  text="Upload your notes. Ask anything. Ace the exam."
  by="word"
  delay={0.12}
  direction="up"
/>
```

## 3. SplitText
Letters fly in individually with a slight rotate — punchy entrance for headings. Triggers on scroll into view by default.
```jsx
import SplitText from './SplitText';

<SplitText text="Your Benkyo" delay={0.03} duration={0.5} />
```

## 4. TypewriterText
Classic typing effect. Pass an array to cycle through multiple phrases (rotating tagline).
```jsx
import TypewriterText from './TypewriterText';

<TypewriterText
  text={['Ask a question...', 'Generate a quiz...', 'Make flashcards...']}
  typingSpeed={50}
  pauseTime={1500}
  loop
/>
```

## 5. DecryptText
Matrix-style scramble that resolves into real text. Good for a techy/AI aesthetic on load, or trigger on hover.
```jsx
import DecryptText from './DecryptText';

<DecryptText text="Powered by RAG + Groq" trigger="mount" speed={40} />

// Or trigger only on hover:
<DecryptText text="Hover to decrypt" trigger="hover" />
```

## 6. WaveText
Continuous idle bobbing wave — subtle, good for a logo/small tagline that stays animated at rest.
```jsx
import WaveText from './WaveText';

<WaveText text="Benkyo" amplitude={6} duration={1.2} />
```

---

## Where to use which (suggested mapping to your Benkyo app)

| Location | Component |
|---|---|
| Landing page hero title | `GradientText` or `SplitText` |
| Landing page subheading | `BlurText` |
| Search/chat input placeholder-style prompt | `TypewriterText` |
| "Powered by Groq / RAG" footer badge | `DecryptText` |
| Nav bar logo | `WaveText` or `ShinyText` (yours) |
| Quiz score reveal ("You scored 8/10!") | `SplitText` (satisfying reveal) |
