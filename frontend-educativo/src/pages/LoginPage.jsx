import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/authService';

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); 
    setError('');
    setLoading(true);

    try {
      await authService.login(email, password);
      onLogin(); // Avisamos a App.jsx que ya entramos
      navigate('/chat');
   } catch (err) {
      // --- CAMBIO: IMPRIMIR EL ERROR REAL EN CONSOLA ---
      console.error("ERROR EN LOGIN:", err); 
      // ------------------------------------------------
      setError('Ocurrió un error al iniciar sesión. Verifica tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 font-sans p-4">
      
      {/* Tarjeta Principal */}
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 transform transition-all animate-fade-in-up">
        
        {/* Encabezado / Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 text-blue-600 text-3xl mb-4 shadow-sm">
            🎓
          </div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Bienvenido a EduBot</h1>
          <p className="text-gray-500 mt-2 text-sm">Ingresa tus credenciales para continuar aprendiendo.</p>
        </div>

        {/* Mensaje de Error */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded mb-6 text-sm flex items-center animate-pulse">
            <span className="mr-2">⚠️</span> {error}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Input Email */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1 pl-1">Correo Electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all placeholder-gray-400"
              placeholder="ejemplo@correo.com"
              required
            />
          </div>

          {/* Input Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1 pl-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all placeholder-gray-400"
              placeholder="••••••••"
              required
            />
          </div>

          {/* Botón Login */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 px-4 rounded-xl text-white font-bold shadow-md transition-all transform hover:-translate-y-0.5 hover:shadow-lg ${
              loading 
                ? 'bg-blue-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Iniciando...
              </span>
            ) : (
              "Iniciar Sesión"
            )}
          </button>
        </form>

        {/* Footer / Link a Registro */}
        <div className="mt-8 text-center pt-6 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            ¿No tienes una cuenta?{' '}
            <Link 
              to="/register" 
              className="font-bold text-blue-600 hover:text-blue-800 hover:underline transition-colors"
            >
              Regístrate aquí
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}