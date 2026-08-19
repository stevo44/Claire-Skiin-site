import React, { useEffect, useRef, useCallback } from 'react';

interface RevealProps {
  children: React.ReactNode;
  direction?: 'up' | 'left' | 'right' | 'scale';
  delay?: number;
  className?: string;
}

const Reveal: React.FC<RevealProps> = ({ children, direction = 'up', delay = 0, className = '' }) => {
  const ref = useRef<HTMLDivElement>(null);

  const getInitialStyle = () => {
    switch (direction) {
      case 'left': return { opacity: 0, transform: 'translateX(-32px)' };
      case 'right': return { opacity: 0, transform: 'translateX(32px)' };
      case 'scale': return { opacity: 0, transform: 'scale(0.94)' };
      default: return { opacity: 0, transform: 'translateY(32px)' };
    }
  };

  const getRevealStyle = () => ({
    opacity: 1,
    transform: 'none',
  });

  const transition = `opacity 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}ms`;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const initial = getInitialStyle();
    Object.assign(el.style, { ...initial, transition });

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          Object.assign(el.style, getRevealStyle());
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay, direction]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
};

export default Reveal;
