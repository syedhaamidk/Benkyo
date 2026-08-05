import { useState, useEffect, useRef } from 'react';
import './TypewriterText.css';

// Classic typewriter effect. Accepts a single string or an array of strings
// to cycle through (like a rotating tagline).
const TypewriterText = ({
  text, // string | string[]
  phrases, // alias for text
  typingSpeed = 50, // ms per character
  speed, // alias for typingSpeed
  deletingSpeed = 30, // ms per character when deleting (array mode only)
  pauseTime = 1500, // ms to pause after a full string is typed (array mode only)
  pause, // alias for pauseTime
  loop = true,
  cursor = true,
  cursorChar = '|',
  disabled = false,
  className = ''
}) => {
  const rawText = text ?? phrases ?? '';
  const actualTypingSpeed = speed ?? typingSpeed;
  const actualPauseTime = pause ?? pauseTime;
  const strings = (Array.isArray(rawText) ? rawText : [rawText]).map(s => String(s ?? ''));
  const [displayed, setDisplayed] = useState('');
  const [stringIndex, setStringIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (disabled) {
      setDisplayed(strings[0]);
      return;
    }

    const current = strings[stringIndex % strings.length];

    const singleStringMode = strings.length === 1 && !loop;

    if (!isDeleting && displayed.length < current.length) {
      timeoutRef.current = setTimeout(() => {
        setDisplayed(current.slice(0, displayed.length + 1));
      }, actualTypingSpeed);
    } else if (!isDeleting && displayed.length === current.length) {
      if (singleStringMode) return; // done, stay as-is
      timeoutRef.current = setTimeout(() => setIsDeleting(true), actualPauseTime);
    } else if (isDeleting && displayed.length > 0) {
      timeoutRef.current = setTimeout(() => {
        setDisplayed(current.slice(0, displayed.length - 1));
      }, deletingSpeed);
    } else if (isDeleting && displayed.length === 0) {
      setIsDeleting(false);
      setStringIndex(i => (i + 1) % strings.length);
    }

    return () => clearTimeout(timeoutRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayed, isDeleting, stringIndex, disabled]);

  return (
    <span className={`typewriter-text ${className}`}>
      {displayed}
      {cursor && <span className="typewriter-cursor">{cursorChar}</span>}
    </span>
  );
};

export default TypewriterText;
