import { useEffect } from 'react';

interface PageMetaProps {
  title: string;
  description?: string;
  ogImage?: string;
  ogType?: 'website' | 'product';
}

const SITE_NAME = 'Claire Skiin';
const DEFAULT_OG_IMAGE = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCvi48xMia9DLLZTj5YvlVIHkFjbNaPmZcKj7FUjgRgPclIk3BuYo9FkZDwU4FHqI81TCH_pndeXUWwTlQOGOUpDjdrfBgM_P503gk5E_Fq9jVg4CfgYjIb1I56FB8tm4SFwnHuOOYx5ac87hc1HSVy3ANODLaOOH2078NYQluo8HuL6oNd_ivsdmnE7mbosOYJmSu7Ly5Rb_ZTjAnTR5v5LcrDX7WfTcK2XjdwmzbPO2WvWJHJFHRT6uRk2zwhr1D977Wvj1LFpIQ';

const setMeta = (name: string, content: string, property = false) => {
  const attr = property ? 'property' : 'name';
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
};

const PageMeta: React.FC<PageMetaProps> = ({
  title,
  description = 'Luxury botanical skincare crafted from Cameroonian rainforests. Discover serums, hair care, lip care, and spa treatments.',
  ogImage = DEFAULT_OG_IMAGE,
  ogType = 'website',
}) => {
  const fullTitle = `${title} | ${SITE_NAME}`;

  useEffect(() => {
    document.title = fullTitle;

    // Standard meta
    setMeta('description', description);

    // Open Graph
    setMeta('og:title',       fullTitle,    true);
    setMeta('og:description', description,  true);
    setMeta('og:image',       ogImage,      true);
    setMeta('og:type',        ogType,       true);
    setMeta('og:site_name',   SITE_NAME,    true);

    // Twitter/X card
    setMeta('twitter:card',        'summary_large_image');
    setMeta('twitter:title',       fullTitle);
    setMeta('twitter:description', description);
    setMeta('twitter:image',       ogImage);
  }, [fullTitle, description, ogImage, ogType]);

  return null;
};

import React from 'react';
export default PageMeta;
