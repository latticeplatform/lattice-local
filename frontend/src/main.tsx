import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './fonts.css';
import './index.css';
import App from './App.tsx';
import ToastProvider from './components/ToastProvider.tsx';
import ConnectProvider from './components/ConnectProvider.tsx';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');
createRoot(rootEl).render(
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
