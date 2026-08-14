'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { resolveBrandingAssetUrl } from './api';
import { BrandingApi } from './endpoints';
import type { BrandingSettings } from './types';

interface BrandingContextValue {
  branding: BrandingSettings | null;
  /** Re-fetches from the server. Call after saving changes on the
   * Settings > Branding tab so the Navbar/tab title update immediately. */
  refreshBranding: () => Promise<void>;
}

const DEFAULT_SITE_NAME = 'Task & Project Manager';

const BrandingContext = createContext<BrandingContextValue | null>(null);

function applyToDocument(branding: BrandingSettings | null) {
  if (typeof document === 'undefined') return;

  document.title = branding?.metaTitle || branding?.siteName || DEFAULT_SITE_NAME;

  const descriptionContent = branding?.metaDescription;
  let descriptionTag = document.querySelector('meta[name="description"]');
  if (descriptionContent) {
    if (!descriptionTag) {
      descriptionTag = document.createElement('meta');
      descriptionTag.setAttribute('name', 'description');
      document.head.appendChild(descriptionTag);
    }
    descriptionTag.setAttribute('content', descriptionContent);
  }

  const keywordsContent = branding?.metaKeywords;
  let keywordsTag = document.querySelector('meta[name="keywords"]');
  if (keywordsContent) {
    if (!keywordsTag) {
      keywordsTag = document.createElement('meta');
      keywordsTag.setAttribute('name', 'keywords');
      document.head.appendChild(keywordsTag);
    }
    keywordsTag.setAttribute('content', keywordsContent);
  }

  const faviconUrl = resolveBrandingAssetUrl(branding?.faviconUrl);
  if (faviconUrl) {
    let iconTag = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!iconTag) {
      iconTag = document.createElement('link');
      iconTag.rel = 'icon';
      document.head.appendChild(iconTag);
    }
    iconTag.href = faviconUrl;
  }
}

/**
 * Fetches the site's branding (name/logo/favicon/metadata) once on mount —
 * GET /branding is public, so this loads before any login — and keeps the
 * document's <title>, meta tags, and favicon in sync with it.
 */
export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<BrandingSettings | null>(null);

  const refreshBranding = useCallback(async () => {
    try {
      const data = await BrandingApi.get();
      setBranding(data);
    } catch {
      // Keep whatever we had (or the built-in defaults) — a failed fetch
      // here shouldn't block the rest of the app from rendering.
    }
  }, []);

  useEffect(() => {
    refreshBranding();
  }, [refreshBranding]);

  useEffect(() => {
    applyToDocument(branding);
  }, [branding]);

  return (
    <BrandingContext.Provider value={{ branding, refreshBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error('useBranding must be used within BrandingProvider');
  return ctx;
}
