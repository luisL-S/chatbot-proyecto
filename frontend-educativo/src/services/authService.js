// URL base de tu Backend
const API_URL = 'http://127.0.0.1:8000/api';

// --- FUNCIÓN 1: LOGIN (Con FormData para FastAPI) ---
export const login = async (username, password) => {
  console.log("Intentando login con:", username);

  // 1. FastAPI OAuth2 espera x-www-form-urlencoded
  const formData = new URLSearchParams();
  formData.append('username', username); // FastAPI siempre busca 'username'
  formData.append('password', password);

  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Error en el login');
  }

  const data = await response.json();
  
  // 2. Guardar Token
  if (data.access_token) {
    localStorage.setItem('token', data.access_token);
  }
  
  // 3. Guardar Usuario (si viene)
  if (data.user) {
    localStorage.setItem('user', JSON.stringify(data.user));
  }

  return data;
};

// --- FUNCIÓN 2: REGISTER ---
export const register = async (email, password) => {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Error en el registro');
  }

  return response.json();
};

// --- FUNCIÓN 3: LOGOUT (La que te fallaba) ---
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('session_id'); // Limpiamos también la sesión del chat
};

// --- UTILIDADES ---
export const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  if (userStr) return JSON.parse(userStr);
  return null;
};

export const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};