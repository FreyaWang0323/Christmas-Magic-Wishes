import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  // StrictMode is disabled to prevent double initialization of Three.js/MediaPipe in dev
  // In production it's fine, but for this complex setup it eases debugging
  <App />
);