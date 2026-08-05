import { motion } from 'motion/react';
import './BlurText.css';

// Reveals text word-by-word (or letter-by-letter) from blurred to sharp
const BlurText = ({
  text,
  children,
  by = 'word', // 'word' | 'letter'
  animateBy,
  delay = 0.05, // stagger delay between each unit, in seconds
  duration = 0.6,
  direction = 'up', // 'up' | 'down' | 'none'
  disabled = false,
  className = ''
}) => {
  const content = String(text || children || '');
  const mode = animateBy || by;
  const actualBy = (mode === 'words' || mode === 'word') ? 'word' : 'letter';
  const actualDelay = delay > 5 ? delay / 1000 : delay;
  const normDir = direction === 'top' ? 'up' : direction === 'bottom' ? 'down' : direction;

  const units = actualBy === 'letter' ? content.split('') : content.split(' ');

  const yOffset = normDir === 'up' ? 12 : normDir === 'down' ? -12 : 0;

  const container = {
    hidden: {},
    visible: {
      transition: { staggerChildren: disabled ? 0 : actualDelay }
    }
  };

  const item = {
    hidden: { opacity: 0, filter: 'blur(10px)', y: yOffset },
    visible: {
      opacity: 1,
      filter: 'blur(0px)',
      y: 0,
      transition: { duration }
    }
  };

  return (
    <motion.span
      className={`blur-text ${className}`}
      variants={container}
      initial={disabled ? 'visible' : 'hidden'}
      animate="visible"
    >
      {units.map((unit, i) => (
        <motion.span key={i} variants={item} className="blur-text-unit">
          {unit}
          {actualBy === 'word' && i !== units.length - 1 ? '\u00A0' : ''}
        </motion.span>
      ))}
    </motion.span>
  );
};

export default BlurText;
