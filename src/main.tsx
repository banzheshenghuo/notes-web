import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import LoginPage from './pages/LoginPage';
import { AuthProvider, useAuth } from './lib/auth';
import './index.css';

function Root() {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="h-dvh flex items-center justify-center text-sm text-stone-300">…</div>;
  }
  return user ? <App /> : <LoginPage />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <Root />
    </AuthProvider>
  </React.StrictMode>
);
