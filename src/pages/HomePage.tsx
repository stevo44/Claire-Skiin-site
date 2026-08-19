import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PRODUCTS, TESTIMONIALS, TICKER_ITEMS } from '../data/products';
import { useCart } from '../store/cartStore';
import { showToast } from '../components/ToastContainer';
import '../claire-styles.css';

export default function HomePage() {
  const navigate = useNavigate();
  const { addToCart, state, toggleWishlist } = useCart();
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [carouselOffset, setCarouselOffset] = useState(0);
  const [email, setEmail] = useState('');
  const doubledTicker = [...TICKER_ITEMS, ...TICKER_ITEMS];
  const featuredProducts = PRODUCTS.slice(0, 6);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTestimonial(i => (i + 1) % TESTIMONIALS.length), 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Counter animation
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target as HTMLElement;
          const target = parseInt(el.dataset.target || '0');
          let start = 0;
          const step = target / (2000 / 16);
          const timer = setInterval(() => {
            start += step;
            if (start >= target) { el.textContent = target.toLocaleString(); clearInterval(timer); }
            else el.textContent = Math.floor(start).toLocaleString();
          }, 16);
          observer.unobserve(el);
        }
      });
    });
    document.querySelectorAll('[data-target]').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const slideCarousel = useCallback((dir: number) => {
    const itemW = 316;
    const maxOffset = Math.max(0, featuredProducts.length * itemW - window.innerWidth * 0.85);
    setCarouselOffset(prev => Math.max(0, Math.min(maxOffset, prev + dir * itemW)));
  }, [featuredProducts.length]);

  const handleAddToCart = (e: React.MouseEvent, product: typeof PRODUCTS[0]) => {
    e.stopPropagation();
    addToCart(product);
    showToast(`${product.name} added to bag`, 'shopping_bag');
  };

  const handleNewsletter = () => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      showToast('Please enter a valid email address', 'error', 'error');
      return;
    }
    showToast('Welcome to the Inner Circle! ✦', 'check_circle');
    setEmail('');
  };

  const goToShop = (category?: string) => {
    if (category) sessionStorage.setItem('shopCategory', category);
    navigate('/shop');
  };

  return (
    <div className="home-container" style={{ paddingTop: '72px' }}>

      {/* Hero */}
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-bg-image" />
          <div className="hero-overlay" />
        </div>
        <div className="hero-content">
          <p className="hero-eyebrow">✦ Elegance Rooted in Heritage ✦</p>
          <h1 className="hero-title">Glow <em>Naturally.</em><br />Feel Beautiful.<br />Be Confident.</h1>
          <p className="hero-subtitle">Formulated with rare botanicals sourced sustainably from Cameroonian rainforests, refined for the modern sanctuary.</p>
          <div className="hero-ctas">
            <button className="btn-primary" onClick={() => goToShop()}>Shop the Collection</button>
            <button className="btn-outline" onClick={() => goToShop('Spa Services')}>Book a Spa Session</button>
          </div>
        </div>
        <div className="scroll-indicator" onClick={() => document.getElementById('homeMain')?.scrollIntoView({ behavior: 'smooth' })}>
          <span>Scroll</span>
          <div className="scroll-line" />
        </div>
      </section>

      {/* Ticker */}
      <div className="ticker">
        <div className="ticker-inner">
          {doubledTicker.map((t, i) => (
            <span key={i} className="ticker-item">{t}<span className="ticker-dot" /></span>
          ))}
        </div>
      </div>

      <div id="homeMain">
        {/* Stats */}
        <div className="stats-row reveal">
          <div className="stat-item"><span className="stat-number" data-target="8432">0</span><span className="stat-label">Happy Clients</span></div>
          <div className="stat-item"><span className="stat-number" data-target="124">0</span><span className="stat-label">Products</span></div>
          <div className="stat-item"><span className="stat-number" data-target="98">0</span><span className="stat-label">% Natural</span></div>
          <div className="stat-item"><span className="stat-number" data-target="5">0</span><span className="stat-label">Years Heritage</span></div>
        </div>

        {/* Categories */}
        <div className="section">
          <span className="section-label reveal">The Collections</span>
          <h2 className="section-title reveal delay-100">Shop by <em>Category</em></h2>
          <div className="categories-grid">
            <div className="category-card category-card-large reveal" onClick={() => goToShop('Skincare')}>
              <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCcAwC7CiCj6AvdhlpFDR6UxA9vRkcCGb1N-OZk-AWhSxe8cXvhkHQ1BnoOrtzmGSyXbNaqs6efhCv1fIgPEMHw_1lQ1SnE-LFMrlcVBsgv6MMm7OWAVmE7i3vyosX-Qr6ctVCg3xtg1xsCO0dOHN9uVLJiJx1z9uTJGR6S79vseniNmXGgssm2G6QnkhEnYpfPi0KIQsTUB_ceZFRmP_UpxvRJ0BDlnW7IQRrhUspjGdYcR2sPNQd-3DvXqkR4tFMyFMVMa_ScM_A" alt="Skincare" />
              <div className="category-overlay" />
              <div className="category-info"><h3>Skincare</h3><p>Explore the Collection</p></div>
              <button className="card-view-btn">View All</button>
            </div>
            <div>
              <div className="category-card category-card-medium reveal delay-100" onClick={() => goToShop('Hair Care')}>
                <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDTHGH9sKQzQYs2Pm8lQ07wHWVMUSxq04Lg9RHdsTtWuMYF_2c62bAHE0hH8gu3A9Wjn-C4q6Kn1pk-FDylzsWoZrtdHi5G_WDerD7F2nIGSKqjxdtxqOIQERwCWArmfod2037juOv-0YWchsDeoB1pLxkvR3-4OWWORZ1mmE6MHyhgHF1Jyzry5JmCiAypmv6ktsPCnCo_B1H0l-YMofClhCqWSmYNbxO6fttH36gVekA6t8NJZ3LeAIKYRewkhXJsIjMRDEJCvZw" alt="Hair Care" />
                <div className="category-overlay" />
                <div className="category-info"><h3>Hair Care</h3></div>
                <button className="card-view-btn">View All</button>
              </div>
              <div className="category-card category-card-medium reveal delay-200" onClick={() => goToShop('Lip Care')}>
                <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDBcyes5xXseNgAQRwYOcwq5QcVx26kMpwRBOgTiqH1zgV9t7QBszf95MNJzKp4sgy-3JLbzRyvxKWE6ma6p2Ubfrl9Le665ImEomk3vrqPdwRtUNyT1y_w58pF8J7LsoEjY7dD1rpP99TVoOH_htqIjZrtwzppU-LamI2XLW-7jl7PjG3SmkGI7wwqUbDH74JuLYro-6lpHueL1sjTtG-YkJgwC37dgxvBLG-i6h1TU1SjxNxF2gpn-2Ce7KFoiGNrF76XVuaF4Uk" alt="Lip Care" />
                <div className="category-overlay" />
                <div className="category-info"><h3>Lip Care</h3></div>
                <button className="card-view-btn">View All</button>
              </div>
            </div>
            <div className="category-card category-card-full reveal delay-300" onClick={() => navigate('/spa-services')}>
              <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuC5cDFMnZvXSSpYF-YIPLBy0b-u7lAaaoIKCM0vjOSE2lbhmaEwYeyi4rozmKAMgu5KE3bSymRMeUW6gJaBromC_i4N9tJNzZjJ4plB_Yg9zGRmrrcVbtVa2qB0UV_KbIcq21qv0q4TSDENF4s3RvgtJWYfJoyZC-BYbJ4BxnHFIgBMWIs2DVWMTZ8z_lSq37YMdkj7VCvKQmeenefhv5n0kfmgAnPfoJ2mGuIT7qRiwexFPbkCvij63vDp4UMceGxqIiqsgLIJ8u8" alt="Spa" />
              <div className="category-overlay" />
              <div className="category-info"><h3>Spa Services</h3><p>Indulge in our curated sanctuary rituals</p><span>View Menu</span></div>
              <button className="card-view-btn">View Menu</button>
            </div>
          </div>
        </div>

        {/* Featured Products Carousel */}
        <div className="carousel-section">
          <div className="carousel-header">
            <div>
              <span className="section-label reveal">The Essentials</span>
              <h2 className="section-title reveal delay-100">Featured Products</h2>
            </div>
            <div className="carousel-nav">
              <button className="carousel-btn" onClick={() => slideCarousel(-1)}>
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <button className="carousel-btn" onClick={() => slideCarousel(1)}>
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>
          <div className="carousel-track-wrap">
            <div className="carousel-track" style={{ transform: `translateX(-${carouselOffset}px)`, transition: 'transform 0.4s ease' }}>
              {featuredProducts.map(p => (
                <div key={p.id} className="carousel-item" onClick={() => navigate(`/product/${p.id}`)}>
                  <div className="carousel-item-img"><img src={p.img} alt={p.name} loading="lazy" /></div>
                  {p.badge && <span style={{ display: 'inline-block', padding: '2px 10px', background: 'var(--primary)', color: 'white', borderRadius: '100px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>{p.badge}</span>}
                  <h4 style={{ fontFamily: "'Noto Serif',serif", fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.25rem' }}>{p.name}</h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--secondary)', marginBottom: '1rem' }}>{p.sub}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem' }}>{p.priceDisplay}</span>
                    <button
                      className="btn-cart-icon"
                      onClick={e => handleAddToCart(e, p)}
                      title="Add to bag"
                    >
                      <span className="material-symbols-outlined">add_shopping_cart</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Philosophy */}
        <div className="section">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 className="section-title reveal">Our <em>Philosophy</em></h2>
            <div className="reveal delay-100" style={{ width: '80px', height: '1px', background: 'var(--tertiary-fixed-dim)', margin: '1.5rem auto 0' }} />
          </div>
          <div className="philosophy-grid">
            {[
              { icon: 'nature', title: 'Purely Natural', desc: 'Formulated with rare botanicals sourced sustainably from Cameroonian rainforests.' },
              { icon: 'medical_services', title: 'Expert Care', desc: 'Clinically proven rituals administered by certified wellness specialists.', delay: 'delay-200' },
              { icon: 'verified', title: 'Trusted Brand', desc: 'A legacy of excellence, blending heritage wisdom with modern beauty science.', delay: 'delay-400' },
            ].map(card => (
              <div key={card.title} className={`philosophy-card reveal ${card.delay || ''}`}>
                <div className="philosophy-icon"><span className="material-symbols-outlined">{card.icon}</span></div>
                <h3>{card.title}</h3>
                <p>{card.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonials */}
        <div className="testimonial-section">
          <div className="testimonial-card reveal-scale">
            <div className="stars">
              {Array(TESTIMONIALS[currentTestimonial].stars).fill(0).map((_, i) => (
                <span key={i} className="material-symbols-outlined icon-fill" style={{ color: 'var(--tertiary)' }}>star</span>
              ))}
            </div>
            <p className="testimonial-text">"{TESTIMONIALS[currentTestimonial].text}"</p>
            <div className="testimonial-author">
              <span style={{ display: 'block', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', fontSize: '0.72rem' }}>
                {TESTIMONIALS[currentTestimonial].author}
              </span>
              <span style={{ color: 'var(--secondary)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.2em', marginTop: '0.25rem', display: 'block' }}>
                {TESTIMONIALS[currentTestimonial].role}
              </span>
            </div>
            <div className="testimonial-dots">
              {TESTIMONIALS.map((_, idx) => (
                <div key={idx} className={`testimonial-dot ${currentTestimonial === idx ? 'active' : ''}`} onClick={() => setCurrentTestimonial(idx)} />
              ))}
            </div>
          </div>
        </div>

        {/* Newsletter */}
        <div className="newsletter-section">
          <div className="newsletter-card reveal">
            <span className="section-label">Inner Circle</span>
            <h2>Join the Inner Circle</h2>
            <p>Receive exclusive invitations to spa events, heritage storytelling, and early access to our limited batches.</p>
            <div className="newsletter-form">
              <input
                className="newsletter-input"
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleNewsletter()}
              />
              <button className="newsletter-btn" onClick={handleNewsletter}>Subscribe</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
