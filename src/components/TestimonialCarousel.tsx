import React, { useState, useEffect } from 'react';
import { TESTIMONIALS } from '../data/products';

const TestimonialCarousel: React.FC = () => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="bg-surface-container-low py-24 md:py-32 px-6 md:px-12 relative overflow-hidden">
      <div className="max-w-4xl mx-auto text-center relative z-10">
        <span className="material-symbols-outlined text-tertiary text-4xl md:text-[3rem] mb-8 block transition-transform duration-500 hover:scale-110">format_quote</span>
        
        <div className="relative h-[220px] md:h-[180px]">
          {TESTIMONIALS.map((t, idx) => (
            <div
              key={idx}
              className="absolute inset-0 w-full transition-all duration-700 max-w-3xl mx-auto"
              style={{
                opacity: current === idx ? 1 : 0,
                transform: current === idx ? 'translateY(0)' : 'translateY(24px)',
                pointerEvents: current === idx ? 'auto' : 'none'
              }}
            >
              <p className="font-headline text-xl md:text-3xl leading-relaxed mb-6 italic text-on-surface">
                "{t.text}"
              </p>
              <div className="flex flex-col items-center">
                <div className="flex gap-1 mb-2">
                  {[...Array(t.stars)].map((_, i) => (
                    <span key={i} className="material-symbols-outlined text-tertiary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  ))}
                </div>
                <span className="font-label text-[10px] md:text-xs uppercase tracking-widest font-bold text-on-surface-variant block">
                  {t.author}
                </span>
                <span className="text-[10px] uppercase tracking-widest text-outline mt-1 block">
                  {t.role}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-3 mt-12">
          {TESTIMONIALS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrent(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${current === idx ? 'w-8 bg-tertiary' : 'w-2 bg-outline-variant hover:bg-outline'}`}
              aria-label={`Go to testimonial ${idx + 1}`}
            />
          ))}
        </div>
      </div>
      
      {/* Decorative ambient blurred orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-tertiary/5 rounded-full blur-[100px] pointer-events-none z-0"></div>
    </section>
  );
};

export default TestimonialCarousel;
