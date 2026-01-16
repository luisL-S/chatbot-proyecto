import api from './api'; 

// Definimos la URL base aquí para no depender de nadie más
const API_URL = 'http://127.0.0.1:8000/api';

export const authService = {
  
  login: async (email, password) => {
    // 1. Enviamos los datos como x-www-form-urlencoded (Estándar de OAuth2 en FastAPI)
    // OJO: Muchos backends de FastAPI esperan FormData, no JSON para el login.
    const formData = new URLSearchParams();
    formData.append('username', email); // FastAPI usa 'username' por defecto, aunque sea email
    formData.append('password', password);

    console.log("Enviando Login:", { email, password });

    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded', // IMPORTANTE
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error del servidor:", errorData);
      throw new Error(errorData.detail || 'Error en el login');
    }

    const data = await response.json();
    console.log("Respuesta del servidor:", data);

    // 2. Intentamos leer el token (puede venir como 'access_token' o 'token')
    const token = data.access_token || data.token;

    if (!token) {
      console.error("El servidor respondió 200 OK pero NO envió el token.", data);
      throw new Error("Error: No se recibió el token de acceso.");
    }

    // 3. Guardamos el token
    localStorage.setItem('token', token);
    
    // Guardamos info del usuario si viene
    if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
    }

    return data;
  },

  register: async (email, password) => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Error en el registro');
    }

    return response.json();
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    if (userStr) return JSON.parse(userStr);
    return null;
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  }
};