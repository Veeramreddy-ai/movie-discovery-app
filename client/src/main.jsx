import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ApiError } from './api/http.js';
import App from './App.jsx';
import { ToastProvider } from './components/ui/Toast.jsx';
import './styles/index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 30 * 60_000, // keep pages of previous searches around so going back is instant
      refetchOnWindowFocus: false,
      // Retry transient problems (network, 5xx, rate limit) but never client mistakes or "not found".
      retry: (failureCount, error) => {
        const clientError = error instanceof ApiError && error.status >= 400 && error.status < 500 && error.status !== 429;
        return !clientError && failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 6000),
    },
    mutations: { retry: false },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>
          <App />
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
