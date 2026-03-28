import React from 'react';
import { createRoot } from 'react-dom/client';
import { SplashScreen } from './SplashScreen';
import './styles.css';

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(
    <React.StrictMode>
      <SplashScreen />
    </React.StrictMode>,
  );
}
