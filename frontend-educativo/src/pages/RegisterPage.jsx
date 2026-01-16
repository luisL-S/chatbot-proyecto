import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/authService';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await authService.register(email, password);
      setSuccess('¡Cuenta creada con éxito! Redirigiendo al login...');
      // Esperamos 2 segundos para que el usuario lea el mensaje y luego lo mandamos al login
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      console.error(err);
      setError('Error al registrar. Es posible que el correo ya exista.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 font-sans p-4">
      
      {/* Tarjeta Principal */}
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 transform transition-all animate-fade-in-up">
        
        {/* Encabezado */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-50 text-purple-600 text-3xl mb-4 shadow-sm">
            🚀
          </div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Crear Cuenta</h1>
          <p className="text-gray-500 mt-2 text-sm">Únete a EduBot y empieza a aprender.</p>
        </div>

        {/* Mensajes de Estado */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded mb-6 text-sm flex items-center">
            <span className="mr-2">⚠️</span> {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-3 rounded mb-6 text-sm flex items-center">
            <span className="mr-2">✅</span> {success}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-5">
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1 pl-1">Correo Electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all placeholder-gray-400"
              placeholder="tu@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1 pl-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all placeholder-gray-400"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 px-4 rounded-xl text-white font-bold shadow-md transition-all transform hover:-translate-y-0.5 hover:shadow-lg ${
              loading 
                ? 'bg-purple-400 cursor-not-allowed' 
                : 'bg-purple-600 hover:bg-purple-700'
            }`}
          >
            {loading ? "Registrando..." : "Registrarse Gratis"}
          </button>
        </form>

        {/* Footer / Link a Login */}
        <div className="mt-8 text-center pt-6 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            ¿Ya tienes cuenta?{' '}
            <Link 
              to="/login" 
              className="font-bold text-purple-600 hover:text-purple-800 hover:underline transition-colors"
            >
              Inicia Sesión aquí
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}