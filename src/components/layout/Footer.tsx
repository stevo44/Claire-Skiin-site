import React from 'react';
import { useNavigate } from 'react-router-dom';

export const Footer: React.FC = () => {
  const navigate = useNavigate();

  return (
    <footer>
      <div className="footer-grid">
        <div className="footer-brand">
          <h3>Claire Skiin</h3>
          <p>Elegance rooted in heritage. We bridge the gap between ancient botanical wisdom and modern aesthetic perfection.</p>
          <div className="social-icons" style={{marginTop:'1.5rem'}}>
            <button className="social-icon"><span className="material-symbols-outlined" style={{fontSize:'18px'}}>public</span></button>
            <button className="social-icon"><span className="material-symbols-outlined" style={{fontSize:'18px'}}>camera</span></button>
            <button className="social-icon"><span className="material-symbols-outlined" style={{fontSize:'18px'}}>play_circle</span></button>
          </div>
        </div>
        <div className="footer-col">
          <h4>Quick Links</h4>
          <a href="#" onClick={(e) => { e.preventDefault(); navigate('/'); }}>Home</a>
          <a href="#" onClick={(e) => { e.preventDefault(); navigate('/shop'); }}>Shop All</a>
          <a href="#" onClick={(e) => { e.preventDefault(); navigate('/spa-services'); }}>Spa Services</a>
          <a href="#">Our Story</a>
        </div>
        <div className="footer-col">
          <h4>Support</h4>
          <a href="#">Contact Us</a>
          <a href="#">Privacy Policy</a>
          <a href="#">Shipping Info</a>
          <a href="#">Returns</a>
        </div>
        <div className="footer-col">
          <h4>Newsletter</h4>
          <p style={{fontSize:'0.82rem', color:'rgba(26,28,28,0.6)', lineHeight:1.6, marginBottom:'1rem'}}>
            Join our inner circle for exclusive ritual guides.
          </p>
          <div style={{display:'flex', borderBottom:'1px solid rgba(111,122,106,0.3)', paddingBottom:'8px'}}>
            <input 
              style={{flex:1, background:'transparent', border:'none', outline:'none', fontFamily:'Manrope,sans-serif', fontSize:'0.82rem', color:'var(--on-surface)'}} 
              placeholder="Email address" 
              type="email"
            />
            <button style={{background:'transparent', border:'none', cursor:'pointer', color:'var(--primary)'}}>
              <span className="material-symbols-outlined">east</span>
            </button>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 Claire Skiin. Elegance rooted in heritage.</span>
        <div style={{display:'flex', gap:'1.5rem'}}>
          <a href="#" style={{color:'inherit', textDecoration:'none', opacity:0.7}}>Privacy</a>
          <a href="#" style={{color:'inherit', textDecoration:'none', opacity:0.7}}>Terms</a>
          <a href="#" style={{color:'inherit', textDecoration:'none', opacity:0.7}}>Sitemap</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
