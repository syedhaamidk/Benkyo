import { useState, useEffect, useRef } from 'react';
import './DecryptText.css';

const DEFAULT_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()_+-={}[]';

// Scrambles random characters, then progressively "decrypts" left-to-right
// into the real text — nice for a techy/AI-tool aesthetic.
const DecryptText = ({
  text,
  speed = 40, // ms between scramble frames
  revealSpeed = 60, // ms between each character locking in
  characters = DEFAULT_CHARS,
  disabled = false,
  trigger = 'mount', // 'mount' | 'hover'
  className = ''
}) => {
  const [displayed, setDisplayed] = useState(disabled ? text : '');
  const [isRunning, setIsRunning] = useState(trigger === 'mount' && !disabled);
  const revealCountRef = useRef(0);
  const scrambleIntervalRef = useRef(null);

  const runDecryption = () => {
    revealCountRef.current = 0;
    clearInterval(scrambleIntervalRef.current);

    scrambleIntervalRef.current = setInterval(() => {
      const revealCount = revealCountRef.current;

      if (revealCount >= text.length) {
        clearInterval(scrambleIntervalRef.current);
        setDisplayed(text);
        setIsRunning(false);
        return;
      }

      const revealed = text.slice(0, revealCount);
      const scrambledLength = text.length - revealCount;
      const scrambled = Array.from({ length: scrambledLength }, () =>
        text[revealCount] === ' '
          ? ' '
          : characters[Math.floor(Math.random() * characters.length)]
      ).join('');

      setDisplayed(revealed + scrambled);

      // advance the reveal pointer roughly every revealSpeed/speed frames
      if (Math.random() < speed / revealSpeed) {
        revealCountRef.current += 1;
      }
    }, speed);
  };

  useEffect(() => {
    if (disabled) {
      setDisplayed(text);
      return;
    }
    if (trigger === 'mount') {
      runDecryption();
    }
    return () => clearInterval(scrambleIntervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, disabled]);

  const handleMouseEnter = () => {
    if (trigger === 'hover' && !disabled) {
      setIsRunning(true);
      runDecryption();
    }
  };

  return (
    <span className={`decrypt-text ${className}`} onMouseEnter={handleMouseEnter}>
      {displayed || text}
    </span>
  );
};

export default DecryptText;
