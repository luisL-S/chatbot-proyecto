import axios from 'axios';

// Asegúrate que esta es la URL base correcta. 
// Si tu backend corre en el puerto 8000, esto está bien.
const API_URL = 'http://https://backend-proyect-j2u2.onrender.com'; 

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;