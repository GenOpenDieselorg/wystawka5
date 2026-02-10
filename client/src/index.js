import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import logger from './utils/logger';

// Initialize logging
logger.info('Frontend application started');

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

