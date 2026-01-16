const API_URL = 'http://127.0.0.1:8000/api';

export const chatService = {
  
  // 1. OBTENER TODAS LAS SESIONES (Para la barra lateral)
  getAllSessions: async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/chat/history`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // <--- IMPORTANTE
        },
      });

      if (!response.ok) {
        console.error("Error al obtener historial:", response.statusText);
        return [];
      }

      const data = await response.json();
      console.log("Sesiones cargadas:", data); // <--- MIRA LA CONSOLA DEL NAVEGADOR
      return data;
    } catch (error) {
      console.error("Error de red:", error);
      return [];
    }
  },

  // 2. OBTENER MENSAJES DE UN CHAT ESPECÍFICO
  getSessionHistory: async (sessionId) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/chat/history/${sessionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });
    return response.json();
  },

  // 3. ENVIAR MENSAJE NUEVO
  sendMessage: async (message, sessionId = null) => {
    const token = localStorage.getItem('token');
    
    const body = {
      message: message,
      model: "gemini-1.5-flash"
    };

    if (sessionId) {
      body.session_id = sessionId;
    }

    const response = await fetch(`${API_URL}/chat/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error('Error en la petición');
    }

    return response.json();
  },

  deleteSession: async (sessionId) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/chat/history/${sessionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      },
    });

    if (!response.ok) {
      throw new Error('Error al eliminar el chat');
    }
    return true;
  }
};