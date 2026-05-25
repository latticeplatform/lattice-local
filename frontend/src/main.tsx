import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext.tsx';
import './fonts.css';
import './index.css';
import App from './App.tsx';
import { ConnectProvider } from './context/ConnectContext.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <ConnectProvider>
          <App />
        </ConnectProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>
);
