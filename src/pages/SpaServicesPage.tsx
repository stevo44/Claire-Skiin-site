import React, { useState } from 'react';
import SpaBookingModal from '../components/SpaBookingModal';

const SpaServicesPage: React.FC = () => {
  const [bookingOpen, setBookingOpen] = useState(false);
  const waxingServices = [
    { name: 'Silk Smooth Wax', price: '15,000', desc: 'Full body exfoliation followed by our signature hypoallergenic resin application.' },
    { name: 'Bikini Couture', price: '20,000', desc: 'Specialized waxing for sensitive areas with post-treatment soothing serum.' },
    { name: 'Facial Refinement', price: '12,000', desc: 'Delicate brow and lip shaping for a perfectly framed silhouette.' },
    { name: 'Lower Limbs', price: '18,000', desc: 'Complete leg smoothing ending with a calming floral water mist.' },
  ];

  const advancedTreatments = [
    {
      name: 'Micro-Needling',
      desc: 'Regenerative therapy to stimulate collagen, reduce scarring, and refine texture.',
      price: '75,000',
      icon: 'skillet',
    },
    {
      name: 'LED Phototherapy',
      desc: 'Targeted light spectrums to heal inflammation and accelerate cellular repair.',
      price: '55,000',
      icon: 'blur_on',
    },
    {
      name: 'Hydro-Infusion',
      desc: 'Vacuum-assisted dermal cleaning paired with potent serum infusions.',
      price: '65,000',
      icon: 'water_drop',
    },
  ];

  return (
    <div className="bg-surface text-on-surface font-body selection:bg-tertiary/20 min-h-screen">
      <main className="pt-28 pb-24">
        {/* Hero Section */}
        <section className="max-w-screen-2xl mx-auto px-6 md:px-12 mb-20 md:mb-32">
          <div className="flex flex-col lg:flex-row lg:items-center items-start gap-12 md:gap-16">
            <div className="w-full lg:w-1/2">
              <p className="font-label text-xs tracking-widest uppercase text-tertiary mb-6">The Earthbound Sanctuary</p>
              <h1 className="font-headline text-4xl md:text-6xl lg:text-8xl leading-tight text-on-surface mb-8">
                The Menu of <span className="italic text-tertiary">Radiance</span>
              </h1>
              <p className="font-body text-base md:text-xl text-on-surface-variant max-w-xl leading-relaxed mb-10">
                Inspired by the lush verdancy of Cameroon and the refined heritage of French aesthetics. Every treatment at Claire Skiin is a curated ritual for the body and soul.
              </p>
              <div className="h-px w-32 bg-outline-variant/30" />
            </div>
            <div className="w-full lg:w-1/2 relative group">
              <div className="aspect-[4/5] rounded-xl overflow-hidden shadow-[0_10px_40px_-10px_rgba(26,28,28,0.04)]">
                <img
                  alt="Luxury spa treatment room"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBKEnkABJMgR8E2Rn5X7k7LCKcAt7b28FEHJAl7Lqz84_MkfSRnBaYcUaWjaKYZ0H93wCwoybYlFVSgKG7-dJyXKIpOBzdWfrEXyRzrSDN482dwWHeQu54MTOIhaBjnUoQ4DXZ-5htYzi-_qr-xtf1wogCeKmg-JLKyz9mS0Mf3dhCLp1bxUteEe8jFh9jPzE9rY1Q4n2ifQByPDlkT8qqC03Bo4ECLrXYdjufp3SpsB8EKPSWRSKKiKI4VOtQxY7srUcwc9QqiEAw"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Facial Sanctuaries */}
        <section className="mb-20 md:mb-32">
          <div className="max-w-screen-2xl mx-auto px-6 md:px-12 mb-12 md:mb-16">
            <div className="flex flex-col md:flex-row justify-between items-baseline gap-4">
              <h2 className="font-headline text-3xl md:text-5xl text-primary">Facial Sanctuaries</h2>
              <span className="font-label text-sm uppercase tracking-[0.2em] text-outline">Bespoke Skin Rituals</span>
            </div>
          </div>

          <div className="max-w-screen-2xl mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
            {/* Main Feature */}
            <div className="md:col-span-8 bg-surface-container-low rounded-xl p-8 md:p-16 relative overflow-hidden flex flex-col justify-between min-h-[400px] md:min-h-[500px]">
              <div className="relative z-10">
                <h3 className="font-headline text-2xl md:text-3xl mb-4">Radiance Glow Facial</h3>
                <p className="font-body text-on-surface-variant max-w-md text-base md:text-lg leading-relaxed mb-8">
                  Our signature illuminating treatment using wild-harvested botanicals to restore natural luminosity and skin vitality.
                </p>
              </div>
              <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between border-t border-outline-variant/20 pt-8 gap-6">
                <span className="font-label text-xl tracking-wider text-tertiary">35,000 XAF</span>
                <button onClick={() => setBookingOpen(true)} className="bg-gradient-to-br from-primary to-primary-container text-white px-8 md:px-10 py-4 rounded-xl font-label text-xs uppercase tracking-widest hover:scale-105 transition-transform duration-300">
                  Reserve Ritual
                </button>
              </div>
              {/* Background Decor */}
              <div className="absolute -bottom-20 -right-20 w-64 md:w-96 h-64 md:h-96 opacity-10 pointer-events-none">
                <span className="material-symbols-outlined text-[200px] md:text-[300px] text-primary">energy_savings_leaf</span>
              </div>
            </div>

            {/* Verdant Detox */}
            <div className="md:col-span-4 bg-surface-container-lowest rounded-xl p-8 md:p-10 shadow-[0_10px_40px_-10px_rgba(26,28,28,0.04)] flex flex-col justify-between">
              <div>
                <h3 className="font-headline text-xl md:text-2xl mb-4">Verdant Detox</h3>
                <p className="font-body text-on-surface-variant text-sm leading-relaxed mb-6">
                  Deep purification for urban skin using volcanic clay and forest-sourced antioxidants.
                </p>
                <div className="font-label text-lg text-tertiary">28,000 XAF</div>
              </div>
              <div className="mt-8 overflow-hidden rounded-lg aspect-square">
                <img
                  alt="Green clay facial mask"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuB7Q1Y2k7vFUwqrRIM-sEEzOcnZIg8SZHmCRzrDz9WnZO5QlBs3XJxq7GaiMh9nfacgDfI-JsT86U-YjHxlIKxQ5-wUeplT2prC-wrQQbYt4M6qBSpamHBHQu6FJKbQ-4P59cNup0GasuYBWB5_uK11Q1EU-6EBDfxyj2awAaOnwzpUSTK146KLC_g4IEktMX1KAFkgQC3tw9j-Np64peboxL5n--SZ7Z8cOuNNON0LI3katRVmhAjTsXjW2k9LO9mtqfvXdHpWXYI"
                />
              </div>
            </div>

            {/* Lumière Peeling */}
            <div className="md:col-span-4 bg-surface-container-lowest rounded-xl p-8 md:p-10 shadow-[0_10px_40px_-10px_rgba(26,28,28,0.04)]">
              <h3 className="font-headline text-xl md:text-2xl mb-4">Lumière Peeling</h3>
              <p className="font-body text-on-surface-variant text-sm leading-relaxed mb-6">
                Gentle enzyme exfoliation that unveils a velvety, Parisian porcelain finish.
              </p>
              <div className="font-label text-lg text-tertiary">42,000 XAF</div>
            </div>

            {/* Ancestral Hydration */}
            <div className="md:col-span-8 bg-surface-variant/30 rounded-xl p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center gap-8 md:gap-12">
              <div className="hidden md:block w-1/3 aspect-video rounded-lg overflow-hidden flex-shrink-0">
                <img
                  alt="Spa massage oils"
                  className="w-full h-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDpaRheSg87lOI6EC4Yz3NtS-j4KiZgiKa1WoAqGLWEVQrVjCmJL2b4ra5U4Pz-p9yntJFVAX4qQhQTJjK7DL1GAdIzdVpuBQo3YLWfkrHnqTW7ect1tUZdJPy5TupqDgKdob6NfU7mSBmjtaXnT_Xo3dugkSdiFDY6hEnGyRsTpcDcKfLvxCxWypeAo3eHAUemPUQdjcnX15Jz3v2rasDR-CNBEq0pXZZnt2TpDJkJWRrQIHVzzWVWS1rBFQOSX45B-__XyLccSFg"
                />
              </div>
              <div className="flex-1">
                <h3 className="font-headline text-xl md:text-2xl mb-4">Ancestral Hydration</h3>
                <p className="font-body text-on-surface-variant text-sm leading-relaxed mb-4">
                  Intense moisture therapy inspired by traditional balm-making.
                </p>
                <div className="font-label text-lg text-tertiary">45,000 XAF</div>
              </div>
            </div>
          </div>
        </section>

        {/* Cultural Divider */}
        <div className="flex justify-center items-center py-12 md:py-24">
          <span className="material-symbols-outlined text-4xl text-tertiary opacity-30">eco</span>
        </div>

        {/* Art of Waxing */}
        <section className="max-w-screen-2xl mx-auto px-6 md:px-12 mb-20 md:mb-32">
          <div className="flex flex-col lg:flex-row gap-12 md:gap-20">
            <div className="w-full lg:w-1/3">
              <h2 className="font-headline text-3xl md:text-4xl mb-8">Art of Waxing</h2>
              <p className="font-body text-on-surface-variant leading-relaxed mb-8">
                Precision and care meet premium botanical resins. We transform a necessity into a luxurious smoothing ritual that respects the delicate nature of your skin.
              </p>
              <div className="bg-tertiary/10 p-6 md:p-8 rounded-xl border-l-4 border-tertiary">
                <p className="italic text-tertiary font-serif text-base md:text-lg">
                  "The skin is the body's canvas; we ensure it remains flawlessly smooth."
                </p>
              </div>
            </div>
            <div className="w-full lg:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-x-8 md:gap-x-12 gap-y-10 md:gap-y-16">
              {waxingServices.map((s, idx) => (
                <div key={idx} className="group cursor-default">
                  <div className="flex justify-between items-end border-b border-outline-variant/30 pb-4 mb-4">
                    <h4 className="font-headline text-xl group-hover:text-primary transition-colors">{s.name}</h4>
                    <span className="font-label text-sm text-tertiary whitespace-nowrap ml-4">{s.price} XAF</span>
                  </div>
                  <p className="text-sm text-on-surface-variant font-body">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Advanced Aesthetics — Dark Section */}
        <section className="bg-primary text-white py-16 md:py-32 rounded-[2rem] md:rounded-[4rem] mx-4 md:mx-12 overflow-hidden relative mb-20 md:mb-32">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-black/10 -skew-x-12 translate-x-24 pointer-events-none" />
          <div className="max-w-screen-2xl mx-auto px-6 md:px-12 relative z-10">
            <div className="max-w-2xl mb-12 md:mb-16">
              <h2 className="font-headline text-3xl md:text-6xl mb-6 md:mb-8">Advanced Aesthetics</h2>
              <p className="font-body text-white/90 text-base md:text-lg leading-relaxed">
                Where clinical science meets holistic luxury. Our advanced treatments utilize the latest technology to achieve visible, lasting transformation.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
              {advancedTreatments.map((t, idx) => (
                <div
                  key={idx}
                  className="bg-white/5 backdrop-blur-sm border border-white/10 p-8 md:p-10 rounded-xl hover:bg-white/10 transition-colors duration-300"
                >
                  <div className="text-tertiary-fixed mb-6">
                    <span className="material-symbols-outlined text-5xl">{t.icon}</span>
                  </div>
                  <h4 className="font-headline text-xl md:text-2xl mb-4">{t.name}</h4>
                  <p className="text-sm opacity-80 mb-8 leading-relaxed">{t.desc}</p>
                  <div className="font-label text-lg md:text-xl">{t.price} XAF</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="max-w-screen-2xl mx-auto px-6 md:px-12 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-headline text-3xl md:text-4xl mb-6 md:mb-8">Begin Your Journey to Sanctuary</h2>
            <p className="font-body text-on-surface-variant mb-10 md:mb-12 text-base md:text-lg">
              Schedule a consultation with our experts to design a treatment plan as unique as your skin.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 md:gap-6">
              <button onClick={() => setBookingOpen(true)} className="bg-gradient-to-br from-primary to-primary-container text-white px-10 md:px-12 py-4 md:py-5 rounded-xl font-label text-sm uppercase tracking-widest shadow-[0_10px_40px_-10px_rgba(26,28,28,0.04)] hover:scale-105 transition-transform duration-300">
                Book Online
              </button>
              <button className="bg-surface-container-lowest text-primary border border-outline-variant/20 px-10 md:px-12 py-4 md:py-5 rounded-xl font-label text-sm uppercase tracking-widest hover:bg-surface-container-low transition-colors">
                Call the Concierge
              </button>
            </div>
          </div>
        </section>
      </main>
      <SpaBookingModal open={bookingOpen} onClose={() => setBookingOpen(false)} />
    </div>
  );
};

export default SpaServicesPage;
