import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// eslint-disable-next-line no-undef
const vscode = typeof acquireVsCodeApi !== 'undefined' ? acquireVsCodeApi() : null;
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App vscode={vscode} />);
