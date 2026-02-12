import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// 1. Agregamos los iconos Eye y EyeOff
import { Lock, Mail, User, ArrowRight, ShieldCheck, GraduationCap, Users, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);

  // 2. Estado para controlar la visibilidad de la contraseña
  const [showPassword, setShowPassword] = useState(false);

  // Estados para Grado y Sección
  const [grade, setGrade] = useState('1er Año');
  const [section, setSection] = useState('A');

  const [formData, setFormData] = useState({ email: '', password: '', username: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const url = isRegister
      ? 'https://backend-proyect-j2u2.onrender.com/api/auth/register'
      : 'https://backend-proyect-j2u2.onrender.com/api/auth/login';

    try {
      let body;
      let headers = {};

      if (isRegister) {
        headers = { 'Content-Type': 'application/json' };
        body = JSON.stringify({ ...formData, grade, section });
      } else {
        headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
        const params = new URLSearchParams();
        params.append('username', formData.email);
        params.append('password', formData.password);
        body = params;
      }

      const res = await fetch(url, { method: 'POST', headers, body });
      const data = await res.json();

      if (!res.ok) throw new Error(data.detail || 'Error en la solicitud');

      if (isRegister) {
        alert("¡Registro exitoso! Ahora inicia sesión.");
        setIsRegister(false);
      } else {
        localStorage.setItem('token', data.access_token);
        navigate('/chat');
      }

    } catch (err) {
      setError(err.message);
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
          <h1 className="text-3xl font-extrabold text-white tracking-tight">EduBot LMS</h1>
          <p className="text-slate-400 mt-2 text-sm font-medium">{isRegister ? "Crea tu cuenta de alumno" : "Ingresa a tu plataforma"}</p>
        </div>

        {error && <div className="bg-rose-900/20 text-rose-300 p-3 rounded-xl text-sm mb-6 border border-rose-900/50 text-center font-medium">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          {isRegister && (
            <>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                  <User size={20} />
                </div>
                <input
                  type="text" placeholder="Nombre Completo" required
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-950 border border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-white font-medium placeholder:text-slate-600"
                  value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })}
                />
              </div>

              {/* FILA: GRADO Y SECCIÓN */}
              <div className="flex gap-4">
                <div className="relative group w-2/3">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                    <GraduationCap size={20} />
                  </div>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full pl-11 pr-8 py-3.5 bg-slate-950 border border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-white font-medium appearance-none cursor-pointer hover:bg-slate-900"
                  >
                    <option value="1er Año">1er Año</option>
                    <option value="2do Año">2do Año</option>
                    <option value="3er Año">3er Año</option>
                    <option value="4to Año">4to Año</option>
                    <option value="5to Año">5to Año</option>
                  </select>
                </div>

                <div className="relative group w-1/3">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Users size={20} />
                  </div>
                  <select
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    className="w-full pl-10 pr-4 py-3.5 bg-slate-950 border border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-white font-medium appearance-none cursor-pointer hover:bg-slate-900"
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
              <Mail size={20} />
            </div>
            <input
              type="email" placeholder="Correo Institucional" required
              className="w-full pl-11 pr-4 py-3.5 bg-slate-950 border border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-white font-medium placeholder:text-slate-600"
              value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          {/* 3. CAMPO CONTRASEÑA MODIFICADO */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
              <Lock size={20} />
            </div>
            <input
              // Alternamos entre 'text' y 'password'
              type={showPassword ? "text" : "password"}
              placeholder="Contraseña"
              required
              // Aumentamos el padding derecho (pr-12) para que el texto no choque con el ojo
              className="w-full pl-11 pr-12 py-3.5 bg-slate-950 border border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-white font-medium placeholder:text-slate-600"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
            />
            {/* BOTÓN PARA ALTERNAR VISIBILIDAD */}
            <button
              type="button" // Importante para que no envíe el formulario al hacer click
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-indigo-400 transition-colors cursor-pointer outline-none"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <button disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-900/20 flex justify-center items-center gap-2 active:scale-95 border border-indigo-500">
            {loading ? "Procesando..." : (isRegister ? "Registrarse" : "Ingresar")}
            {!loading && <ArrowRight size={20} />}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-slate-800 pt-6">
          <button onClick={() => { setIsRegister(!isRegister); setError(''); }} className="text-sm font-bold text-slate-400 hover:text-indigo-400 transition-colors">
            {isRegister ? "¿Ya tienes cuenta? Inicia sesión" : "¿No tienes cuenta? Regístrate gratis"}
          </button>
        </div>
      </div>
    </div>
  );
}