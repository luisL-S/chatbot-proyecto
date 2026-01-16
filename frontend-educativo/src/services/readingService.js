const API_URL = 'http://127.0.0.1:8000/api';

// Aceptamos un segundo parámetro: sessionId
export const uploadFileForQuiz = async (file, sessionId = null) => {
  const formData = new FormData();
  formData.append('file', file);
  
  // Si hay una sesión activa, la enviamos
  if (sessionId) {
    formData.append('session_id', sessionId);
  }

  const token = localStorage.getItem('token');

  try {
    const response = await fetch(`${API_URL}/reading/upload-quiz`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Error al subir el archivo');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error en readingService:", error);
    throw error;
  }
};