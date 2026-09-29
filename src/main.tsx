import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import Dashboard from './dashboard/Dashboard';
import LocationSetup from './location/LocationSetup';
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error('No se encontró el contenedor #root en index.html');
}

createRoot(container).render(
  <StrictMode>
    {window.location.pathname.replace(/\/$/, '') === '/dashboard'
      ? <Dashboard />
      : window.location.pathname.replace(/\/$/, '') === '/preparar-ubicacion'
        ? <LocationSetup />
        : <App />}
  </StrictMode>,
);
