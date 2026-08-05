# UI Components — Benkyo Mapping

Copy each `.jsx` + `.css` pair into your project (e.g. `src/components/ui/`).

## 1. LineSidebar
Proximity-reactive navigation list — labels shift color/position as the cursor nears them.
```jsx
<LineSidebar
  items={['Chat', 'Quiz', 'Flashcards', 'Notes', 'Progress']}
  accentColor="#A855F7"
  defaultActive={0}
  onItemClick={(index, label) => setActiveTab(label)}
/>
```
**Use for:** the main in-app nav (switching between Chat / Quiz / Flashcards / Progress tabs).

## 2. GlassSurface
Frosted-glass panel with SVG chromatic displacement (falls back to plain `backdrop-filter` blur on Safari/Firefox — handled automatically).
```jsx
<GlassSurface width="100%" height={220} borderRadius={20} backgroundOpacity={0.1}>
  <QuizQuestionCard question={currentQuestion} />
</GlassSurface>
```
**Use for:** quiz question cards, flashcard fronts/backs, the chat message container.
**Note:** requires a parent with defined width/height (or pass `width="100%"` inside a sized container) since it measures its own bounding box for the displacement map.

## 3. ClickSpark
Small particle-burst on click, layered behind any children.
```jsx
<ClickSpark sparkColor="#A855F7" sparkCount={8} duration={400}>
  <button onClick={handleSubmitAnswer}>Submit Answer</button>
</ClickSpark>
```
**Use for:** 1-2 key actions only (submit quiz answer, generate flashcards). Avoid wrapping every button — it dilutes the effect.

## 4. StarBorder
Animated glowing border, good for a single hero CTA.
```jsx
<StarBorder as="button" color="#A855F7" speed="5s" onClick={handleUpload}>
  Upload Your Notes
</StarBorder>
```
**Use for:** the primary landing-page CTA ("Upload Notes" / "Start Studying"). Keep to one button app-wide so it stays a focal point.

## 5. Particles
Ambient floating particle background using `ogl` (lightweight WebGL — much cheaper than `three.js`).
```bash
npm install ogl
```
```jsx
<div style={{ width: '100%', height: '600px', position: 'relative' }}>
  <Particles
    particleColors={['#A855F7', '#ffffff']}
    particleCount={200}
    particleSpread={10}
    speed={0.1}
    particleBaseSize={100}
    moveParticlesOnHover
    disableRotation={false}
  />
</div>
```
**Use for:** landing-page hero background, sitting behind your title text (`position: absolute`, title on top with a higher `z-index`).

**Particles vs. LaserFlow — pick one, not both:** both are landing-page hero backgrounds and would visually compete/compound performance cost if stacked. `Particles` (ogl) is lighter and calmer — safer default for varied hardware. `LaserFlow` (three.js) is a bigger, punchier effect but heavier — use it instead of Particles if you want a bolder statement and have confirmed it runs smoothly on your test machine.

---

## Suggested combo for the landing page
```jsx
<GlassSurface width={480} height={200} backgroundOpacity={0.08}>
  <div>
    <GradientText text="Study Smarter" />
    <BlurText text="Upload your notes. Ask anything. Ace the exam." />
    <StarBorder as="button" color="#A855F7" onClick={handleGetStarted}>
      Get Started
    </StarBorder>
  </div>
</GlassSurface>
```

## Performance notes
- `GlassSurface` uses SVG filters — fine for a handful of cards on screen, avoid using it for every single flashcard in a long scrolling list (render only the visible ones, or use a cheaper `backdrop-filter: blur()` div for list items and reserve `GlassSurface` for focal cards).
- `ClickSpark` and `LineSidebar` are both lightweight (canvas/rAF-based, cleanup handled via `ResizeObserver`/`cancelAnimationFrame`) — safe to use freely.
- `StarBorder` is pure CSS animation — negligible cost.
