import { useState, createContext, useContext, ReactNode } from 'react';

type Page = 'comments' | 'profile' | 'moderation' | 'admin' | 'notifications';

interface NavigationContextType {
  currentPage: Page;
  navigateTo: (page: Page) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [currentPage, setCurrentPage] = useState<Page>('comments');

  const navigateTo = (page: Page) => {
    setCurrentPage(page);
  };

  return (
    <NavigationContext.Provider value={{ currentPage, navigateTo }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigate() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigate must be used within a NavigationProvider');
  }
  return context;
}
