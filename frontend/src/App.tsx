import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from './context/SessionContext';
import { RootLayout } from './components/layout/RootLayout';
import { UploadPage } from './pages/UploadPage';
import { ShareCreatedPage } from './pages/ShareCreatedPage';
import { ReceiverPage } from './pages/ReceiverPage';
import { SecurityPage } from './pages/SecurityPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { InitialLoadingScreen } from './components/ui/InitialLoadingScreen';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

const SESSION_LOADED_KEY = 'fnf_initial_loaded';

export const App: React.FC = () => {
  // Check sessionStorage so loading is only shown once on initial entry, never on refresh
  const [initialLoading, setInitialLoading] = useState<boolean>(() => {
    try {
      return !sessionStorage.getItem(SESSION_LOADED_KEY);
    } catch {
      return false;
    }
  });

  const handleLoadingComplete = () => {
    try {
      sessionStorage.setItem(SESSION_LOADED_KEY, 'true');
    } catch {
      // Ignore storage errors in restricted iframe/private contexts
    }
    setInitialLoading(false);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        {initialLoading && (
          <InitialLoadingScreen onComplete={handleLoadingComplete} />
        )}
        <BrowserRouter>
          <Routes>
            <Route element={<RootLayout />}>
              <Route path="/" element={<UploadPage />} />
              <Route path="/share-created" element={<ShareCreatedPage />} />
              <Route path="/s/:token" element={<ReceiverPage />} />
              <Route path="/share/:token" element={<ReceiverPage />} />
              <Route path="/security" element={<SecurityPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/404" element={<NotFoundPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </SessionProvider>
    </QueryClientProvider>
  );
};

export default App;
