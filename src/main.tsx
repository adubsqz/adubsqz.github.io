import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import PasswordGate from './components/PasswordGate';
import { mountCloudflareBeacon } from './cloudflareBeacon';
import { initializeSecurity } from './utils/security';
import './index.css';

initializeSecurity();
mountCloudflareBeacon(import.meta.env.VITE_CF_BEACON_TOKEN);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PasswordGate>
      <App />
    </PasswordGate>
  </StrictMode>
);
