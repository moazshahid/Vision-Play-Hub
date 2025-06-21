import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { submitScore } from './utils/api';

// Added: Create React root and render App component in StrictMode
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
window.submitScore = submitScore;