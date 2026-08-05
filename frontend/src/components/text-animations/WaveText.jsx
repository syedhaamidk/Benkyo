import { motion } from 'motion/react';
import './WaveText.css';

// Continuous idle wave — each letter bobs up and down with a phase offset
const WaveText = ({
  text,
  amplitude = 8, // px of vertical movement
  duration = 1.2, // seconds per bob cycle
  staggerDelay = 0.05, // phase offset between letters
  disabled = false,
  className = ''
}) => {
  const letters = text.split('');

  return (
    <span className={`wave-text ${className}`}>
      {letters.map((char, i) => (
        <motion.span
          key={i}
          className="wave-text-char"
          animate={
            disabled
              ? {}
              : { y: [0, -amplitude, 0] }
          }
          transition={
            disabled
              ? {}
              : {
                  duration,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: i * staggerDelay
                }
          }
        >
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </span>
  );
};

export default WaveText;
