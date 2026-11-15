// Top-level page component. Replaces the three TanStack Start/Router
// files the Lovable build used for this (src/routes/index.tsx,
// src/routes/__root.tsx, src/router.tsx) now that this app is a plain
// static build — AvenadoApp.tsx itself already does all the real work
// (auth, dashboards, nav) and only ever needed two things from whatever
// sits above it: the current page key, and a way to change it. Lovable's
// AGENTS.md documented that contract as "pages are addressed by
// `?p=<nav key>` from the registry in Sidebar.tsx" — reproduced here
// with plain history/URL APIs instead of a router library.
import React, { useCallback, useEffect, useState } from 'react';
import { AvenadoApp } from '@/components/os/AvenadoApp';

const PAGE_KEY_RE = /^[a-z0-9-]{1,60}$/;

function readPageKeyFromUrl(): string | undefined {
  try {
    const p = new URLSearchParams(window.location.search).get('p');
    return p && PAGE_KEY_RE.test(p) ? p : undefined;
  } catch {
    return undefined;
  }
}

export default function App() {
  const [pageKey, setPageKey] = useState<string | undefined>(() => readPageKeyFromUrl());

  // Back/forward navigation (and any other code that changes the URL
  // directly) should move the app the same way clicking a nav item does.
  useEffect(() => {
    const onPopState = () => setPageKey(readPageKeyFromUrl());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const onPageChange = useCallback((key: string) => {
    setPageKey(key);
    const url = new URL(window.location.href);
    if (key) url.searchParams.set('p', key);
    else url.searchParams.delete('p');
    window.history.pushState({}, '', url.toString());
  }, []);

  return <AvenadoApp pageKey={pageKey} onPageChange={onPageChange} />;
}
