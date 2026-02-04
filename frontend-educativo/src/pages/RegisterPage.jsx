import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/authService';
import { ShieldCheck, Mail, Lock, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);

    try {
      await authService.register(email, password);
      setSuccess('¡Cuenta creada con éxito!');
      setTimeout(() => { navigate('/login'); }, 2000);
    } catch (err) {
      console.error(err);
      setError('Error al registrar. Intenta con otro correo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-slate-200">
      <div className="bg-slate-900 w-full max-w-md p-8 rounded-3xl shadow-2xl border border-slate-800">

        <div className="text-center mb-8">
          <div className="bg-slate-800 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-400 shadow-lg border border-slate-700">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Crear Cuenta</h1>
          <p className="text-slate-400 mt-2 text-sm font-medium">Únete a EduBot hoy mismo.</p>
        </div>

        {error && <div className="bg-rose-900/20 text-rose-300 p-3 rounded-xl mb-6 text-sm text-center border border-rose-900/50 font-medium">{error}</div>}
        {success && <div className="bg-emerald-900/20 text-emerald-300 p-3 rounded-xl mb-6 text-sm text-center border border-emerald-900/50 font-medium">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors"><Mail size={20} /></div>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-slate-950 border border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-white font-medium placeholder:text-slate-600" placeholder="tu@email.com" required />
          </div>

          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors"><Lock size={20} /></div>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-slate-950 border border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-white font-medium placeholder:text-slate-600" placeholder="••••••••" required />
          </div>

          <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-900/20 flex justify-center items-center gap-2 active:scale-95 border border-indigo-500">
            {loading ? "Registrando..." : "Registrarse Gratis"} {!loading && <ArrowRight size={20} />}
          </button>
        </form>

        <div className="mt-8 text-center pt-6 border-t border-slate-800">
          <p className="text-sm text-slate-400 font-medium">¿Ya tienes cuenta? <Link to="/login" className="font-bold text-indigo-400 hover:text-indigo-300 transition-colors">Inicia Sesión</Link></p>
        </div>
      </div>
    </div>
  );
}