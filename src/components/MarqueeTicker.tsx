import React, { useEffect, useRef } from 'react';
import { TICKER_ITEMS } from '../data/products';

const MarqueeTicker: React.FC = () => {
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!innerRef.current) return;
    const items = [...TICKER_ITEMS, ...TICKER_ITEMS];
    innerRef.current.innerHTML = items
      .map(t => `<span class="ticker-item-cs">${t}<span class="ticker-dot-cs"></span></span>`)
      .join('');
  }, []);

  return (
    <div className="w-full bg-primary overflow-hidden py-2.5 relative">
      <div
        ref={innerRef}
        className="ticker-inner-cs flex whitespace-nowrap"
        style={{ animation: 'marquee-cs 30s linear infinite', width: 'max-content' }}
        aria-hidden="true"
      />
      <style>{`
        @keyframes marquee-cs {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .ticker-inner-cs { display: flex; width: max-content; }
        .ticker-item-cs {
          display: inline-flex; align-items: center; gap: 2rem;
          padding: 0 3rem;
          font-size: 0.68rem; font-weight: 700; letter-spacing: 0.2em;
          text-transform: uppercase; white-space: nowrap; color: #ffe082;
        }
        .ticker-dot-cs {
          width: 4px; height: 4px; background: #e9c349;
          border-radius: 50%; flex-shrink: 0; display: inline-block;
        }
      `}</style>
    </div>
  );
};

export default MarqueeTicker;
