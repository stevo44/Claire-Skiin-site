import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageMeta from '../components/PageMeta';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <>
      <PageMeta title="Page Not Found" description="The page you were looking for doesn't exist." />
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6 text-center gap-10 pt-20">

        {/* Decorative number */}
        <div className="relative select-none">
          <p className="font-serif text-[12rem] leading-none text-stone-100 font-bold">404</p>
          <p className="absolute inset-0 flex items-center justify-center font-serif text-3xl text-primary tracking-widest">
            Claire Skiin
          </p>
        </div>

        <div className="max-w-md -mt-4">
          <h1 className="font-headline text-3xl text-on-surface mb-4">
            This page has wandered off
          </h1>
          <p className="text-on-surface-variant text-sm leading-relaxed">
            The page you're looking for doesn't exist, may have moved, or is temporarily unavailable.
            Let us guide you back to something beautiful.
          </p>
        </div>

        {/* Quick links */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            to="/"
            className="px-8 py-4 bg-gradient-to-br from-primary to-primary-container text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:scale-[1.02] transition-transform shadow-lg shadow-primary/20"
          >
            Back to Home
          </Link>
          <Link
            to="/shop"
            className="px-8 py-4 border border-outline/30 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-surface-container-low transition-colors"
          >
            Shop the Collection
          </Link>
        </div>

        {/* Helpful links */}
        <div className="flex flex-wrap gap-6 justify-center text-xs text-on-surface-variant">
          {[
            { label: 'Hair Care', to: '/hair-care' },
            { label: 'Lip Care', to: '/lip-care' },
            { label: 'Spa Services', to: '/spa-services' },
            { label: 'Cart', to: '/cart' },
          ].map(l => (
            <Link key={l.to} to={l.to} className="hover:text-primary transition-colors underline underline-offset-4">
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
