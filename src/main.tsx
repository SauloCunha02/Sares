import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.tsx';
import { AuthProvider } from './lib/AuthContext';
import { DataProvider } from './lib/DataContext';
import { ModalRoot } from './lib/modal';
import { ToastStack } from './lib/toast';
import { montarTooltipGlobal } from './lib/charts';

montarTooltipGlobal();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <App />
          <ModalRoot />
          <ToastStack />
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
