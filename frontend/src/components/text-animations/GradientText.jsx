import { motion } from 'motion/react';
import './GradientText.css';

// Flowing multi-color gradient text — good for hero headings / titles
const GradientText = ({
  text,
  children,
  colors = ['#40ffaa', '#4079ff', '#40ffaa', '#40ffaa', '#4079ff'],
  speed = 3,
  animationSpeed,
  disabled = false,
  className = ''
}) => {
  const content = text || children || '';
  const actualSpeed = animationSpeed || speed;
  const gradientStyle = {
    backgroundImage: `linear-gradient(90deg, ${colors.join(', ')})`,
    backgroundSize: '300% auto',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  };

  return (
    <motion.span
      className={`gradient-text ${className}`}
      style={gradientStyle}
      animate={disabled ? {} : { backgroundPositionX: ['0%', '300%'] }}
      transition={disabled ? {} : { duration: actualSpeed, repeat: Infinity, ease: 'linear' }}
    >
      {content}
    </motion.span>
  );
};

export default GradientText;
