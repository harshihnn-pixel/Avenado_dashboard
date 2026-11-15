import React, { createContext, useContext } from 'react';

/** Lets any page jump to another page in the current portal by its menu key. */
const NavCtx = createContext<(key: string) => void>(() => {});

export function NavProvider({ go, children }: { go: (key: string) => void; children: React.ReactNode }) {
  return <NavCtx.Provider value={go}>{children}</NavCtx.Provider>;
}

export function useGoTo() {
  return useContext(NavCtx);
}
