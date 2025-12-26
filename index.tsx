
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const startApp = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) return;

  try {
    const root = createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error("TitanFit failed to mount:", error);
    rootElement.innerHTML = `<div style="color: white; text-align: center; padding: 20px;">
      <h2>Erro de Inicialização</h2>
      <p>Ocorreu um erro ao carregar o TitanFit. Por favor, recarregue a página.</p>
    </div>`;
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}
