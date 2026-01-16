import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ChatPage from './pages/ChatPage';
import { authService } from './services/authService';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Al cargar la app, revisamos si ya existe un token guardado
    const isAuth = authService.isAuthenticated();
    setIsAuthenticated(isAuth);
    setLoading(false);
  }, []);

  // Función que pasamos al Login para avisar que entramos
  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  // Función para cerrar sesión
  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Cargando...</div>;
  }

  return (
    <Router>
      <Routes>
        {/* Ruta de Login: Si ya estás logueado, te manda al chat automáticamente */}
        <Route 
          path="/login" 
          element={
            !isAuthenticated ? (
              <LoginPage onLogin={handleLogin} /> // <--- AQUÍ PASAMOS LA FUNCIÓN IMPORTANTE
            ) : (
              <Navigate to="/chat" />
            )
          } 
        />

        {/* Ruta de Registro */}
        <Route 
          path="/register" 
          element={!isAuthenticated ? <RegisterPage /> : <Navigate to="/chat" />} 
        />

        {/* Ruta del Chat (Protegida): Si no estás logueado, te manda al Login */}
        <Route 
          path="/chat" 
          element={
            isAuthenticated ? (
              <ChatPage onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" />
            )
          } 
        />

        {/* Ruta por defecto: Redirige según estado */}
        <Route 
          path="*" 
          element={<Navigate to={isAuthenticated ? "/chat" : "/login"} />} 
        />
      </Routes>
    </Router>
  );
}