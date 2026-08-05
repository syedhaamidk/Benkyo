import { motion } from 'motion/react';
import './SplitText.css';

// Letters animate in individually (fly up + fade + slight rotate)
const SplitText = ({
  text,
  delay = 0.03,
  duration = 0.5,
  disabled = false,
  once = true,
  className = ''
}) => {
  const letters = text.split('');
  // Guard against callers accidentally passing milliseconds instead of seconds
  // (e.g. delay={40}) — a value that large would take minutes to fully reveal.
  const normalizedDelay = delay > 1 ? delay / 1000 : delay;

  const container = {
    hidden: {},
    visible: {
      transition: { staggerChildren: disabled ? 0 : normalizedDelay }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 24, rotate: 6 },
    visible: {
      opacity: 1,
      y: 0,
      rotate: 0,
      transition: { duration, ease: [0.22, 1, 0.36, 1] }
    }
  };

  return (
    <motion.span
      className={`split-text ${className}`}
      variants={container}
      initial={disabled ? 'visible' : 'hidden'}
      whileInView="visible"
      viewport={{ once }}
    >
      {letters.map((char, i) => (
        <motion.span key={i} variants={item} className="split-text-char">
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </motion.span>
  );
};

export default SplitText;
