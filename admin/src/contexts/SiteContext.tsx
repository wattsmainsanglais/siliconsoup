import { createContext, useContext, useEffect, useState } from 'react';
import { sites as sitesApi, setCurrentSiteId } from '../api/client';
import type { Site } from '../api/types';

interface SiteContextValue {
  sites: Site[];
  activeSite: Site | null;
  setActiveSite: (site: Site) => void;
}

const SiteContext = createContext<SiteContextValue>({
  sites: [],
  activeSite: null,
  setActiveSite: () => {},
});

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const [sites, setSites] = useState<Site[]>([]);
  const [activeSite, setActiveSiteState] = useState<Site | null>(null);

  useEffect(() => {
    sitesApi.list().then((fetchedSites) => {
      setSites(fetchedSites);
      const savedId = localStorage.getItem('admin-active-site');
      const saved = fetchedSites.find((s) => s.id === savedId) ?? fetchedSites[0] ?? null;
      if (saved) {
        setActiveSiteState(saved);
        setCurrentSiteId(saved.id);
      }
    });
  }, []);

  const setActiveSite = (site: Site) => {
    setActiveSiteState(site);
    setCurrentSiteId(site.id);
    localStorage.setItem('admin-active-site', site.id);
  };

  return (
    <SiteContext.Provider value={{ sites, activeSite, setActiveSite }}>
      {children}
    </SiteContext.Provider>
  );
}

export function useSite() {
  return useContext(SiteContext);
}
