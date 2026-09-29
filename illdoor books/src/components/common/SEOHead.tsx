import React, { useEffect } from 'react';

export interface SEOHeadProps {
  title?: string;
  description?: string;
  canonicalPath?: string;
  noindex?: boolean;
  image?: string;
  schema?: Record<string, any> | Array<Record<string, any>>;
}

export const SEOHead: React.FC<SEOHeadProps> = ({
  title,
  description,
  canonicalPath,
  noindex = false,
  image,
  schema,
}) => {
  useEffect(() => {
    // 1. Dynamic Title
    const baseTitle = 'Illdoor - Polytechnic Used Book Marketplace';
    const fullTitle = title ? title + ' | Illdoor' : baseTitle;
    document.title = fullTitle;

    // 2. Dynamic Description
    const defaultDesc =
      "Illdoor is Bangladesh's dedicated polytechnic textbook marketplace. Buy and sell used diploma engineering books easily.";
    const actualDesc = description || defaultDesc;

    function setMeta(tagType: 'name' | 'property', key: string, val: string) {
      let el = document.querySelector('meta[' + tagType + '="' + key + '"]');
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(tagType, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', val);
    }

    setMeta('name', 'description', actualDesc);
    setMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');

    // Open Graph
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', actualDesc);
    const url = canonicalPath
      ? 'https://illdoor.vercel.app' + canonicalPath
      : 'https://illdoor.vercel.app/';
    setMeta('property', 'og:url', url);
    if (image) {
      setMeta('property', 'og:image', image);
      setMeta('name', 'twitter:image', image);
    }

    // Twitter Card
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', actualDesc);

    // Canonical Link
    let canonicalEl = document.querySelector('link[rel="canonical"]');
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute('href', url);

    // JSON-LD Schema
    let schemaEl = document.querySelector('#seo-json-ld');
    if (schema) {
      if (!schemaEl) {
        schemaEl = document.createElement('script');
        schemaEl.setAttribute('id', 'seo-json-ld');
        schemaEl.setAttribute('type', 'application/ld+json');
        document.head.appendChild(schemaEl);
      }
      schemaEl.textContent = JSON.stringify(schema);
    } else if (schemaEl) {
      schemaEl.remove();
    }
  }, [title, description, canonicalPath, noindex, image, schema]);

  return null;
};