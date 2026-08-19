import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description?: string;
  ogImage?: string;
  ogType?: string;
}

const SITE_NAME = 'Claire Skiin';
const BASE_URL = 'https://claireskiin.com';
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-cover.jpg`;

export function useSEO({ title, description, ogImage, ogType = 'website' }: SEOProps) {
  useEffect(() => {
    const fullTitle = title === SITE_NAME ? title : `${title} | ${SITE_NAME}`;
    document.title = fullTitle;

    const setMeta = (selector: string, attr: string, content: string) => {
      let el = document.querySelector(selector) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        const [attrName, attrVal] = selector.match(/\[([^=]+)="([^"]+)"\]/)?.slice(1) || [];
        if (attrName) el.setAttribute(attrName, attrVal);
        document.head.appendChild(el);
      }
      el.setAttribute(attr, content);
    };

    if (description) {
      setMeta('meta[name="description"]', 'content', description);
    }

    // OG tags (5.2)
    setMeta('meta[property="og:title"]', 'content', fullTitle);
    setMeta('meta[property="og:type"]', 'content', ogType);
    setMeta('meta[property="og:image"]', 'content', ogImage || DEFAULT_OG_IMAGE);
    if (description) {
      setMeta('meta[property="og:description"]', 'content', description);
    }

    return () => {
      document.title = SITE_NAME;
    };
  }, [title, description, ogImage, ogType]);
}
