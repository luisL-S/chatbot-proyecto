import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { authService } from '../services/authService';
import { chatService } from '../services/chatService';
import { uploadFileForQuiz } from '../services/readingService';
import QuizRenderer from '../components/QuizRenderer';

export default function ChatPage({ onLogout }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // --- CARGA DE SESIONES ---
  const loadSessions = async () => {
    try {
      const data = await chatService.getAllSessions();
      setSessions(data);
    } catch (error) {
      console.error("Error cargando historial:", error);
    }
  };

  const handleSelectSession = async (sessionId) => {
    try {
      setLoading(true);
      setCurrentSessionId(sessionId);
      setMessages([]); 

      const history = await chatService.getSessionHistory(sessionId);
      
      const formattedMessages = history.map(msg => {
        let quizData = null;
        let isQuiz = false;
        try {
          if (msg.role === 'model' && msg.content.trim().startsWith('{')) {
             const parsed = JSON.parse(msg.content);
             if (parsed.title && parsed.questions) {
               quizData = parsed;
               isQuiz = true;
             }
          }
        } catch (e) {}

        return {
          sender: msg.role === 'user' ? 'user' : 'bot',
          text: msg.content,
          isQuiz: isQuiz,
          quizData: quizData
        };
      });

      setMessages(formattedMessages);
    } catch (error) {
      console.error("Error cargando chat:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
  };

  const handleLogout = () => {
    authService.logout();
    onLogout();
  };

  // --- ENVÍO DE MENSAJES ---
  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const originalInput = input;
    const userMessage = { sender: 'user', text: originalInput };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await chatService.sendMessage(originalInput, currentSessionId);
      
      const botMessage = { sender: 'bot', text: response.response, isQuiz: false };
      setMessages(prev => [...prev, botMessage]);

      if (!currentSessionId && response.session_id) {
        setCurrentSessionId(response.session_id);
        await loadSessions();
      }
    } catch (error) {
      setMessages(prev => [...prev, { sender: 'bot', text: "⚠️ Error de conexión." }]);
    } finally {
      setLoading(false);
    }
  };

  // --- SUBIDA DE ARCHIVOS ---
  const handleClickUpload = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    const tempUserMsg = { sender: 'user', text: `📎 Analizando archivo: ${file.name}...` };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      // --- CAMBIO AQUÍ: Pasamos currentSessionId ---
      const data = await uploadFileForQuiz(file, currentSessionId); 
      // --------------------------------------------

      const botMsg = {
        sender: 'bot',
        text: "He generado un cuestionario basado en tu documento:",
        quizData: data.quiz, // Nota: El backend ahora devolverá { quiz: {...}, session_id: ... }
        isQuiz: true
      };

      setMessages(prev => [...prev, botMsg]);

      // Si se creó una sesión nueva (porque no había ninguna), actualizamos el estado
      if (!currentSessionId && data.session_id) {
        setCurrentSessionId(data.session_id);
        await loadSessions(); // Recargamos la lista de la izquierda
      }

    } catch (error) {
      setMessages(prev => [...prev, { 
        sender: 'bot', 
        text: "Error al procesar el archivo. Asegúrate de que sea PDF, Word o Imagen." 
      }]);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // --- PETICIÓN DE RETROALIMENTACIÓN DETALLADA ---
  const handleRequestFeedback = async (score, total, mistakes) => {
    
    const prompt = `
    Actúa como un tutor personal de lectura. Acabo de terminar el examen sobre el documento que subí.
    
    📊 Mi resultado: ${score} de ${total} aciertos.
    ❌ Mis errores fueron:
    ${mistakes ? mistakes : 'Ninguno, respondí todo bien.'}

    Por favor, dame una retroalimentación detallada siguiendo esta estructura:
    1. **Análisis de Errores:** Para cada error, explica POR QUÉ mi respuesta estaba mal y DÓNDE dice lo contrario en el texto (cita el fragmento si es posible).
    2. **Nivel de Comprensión:** ¿Mis fallos fueron por no leer bien (literal) o por no entender el contexto (inferencial)?
    3. **Consejo de Mejora:** Dame un consejo breve para mejorar mi lectura basado en este desempeño.

    Sé amable, motivador, pero riguroso con la corrección.
    `;

    // Lo mostramos en el chat
    const userMsg = { sender: 'user', text: "📊 He terminado. Profe, ¿me puede dar mi retroalimentación detallada?" };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const response = await chatService.sendMessage(prompt, currentSessionId);
      const botMsg = { sender: 'bot', text: response.response, isQuiz: false };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
       console.error(error);
       setMessages(prev => [...prev, { sender: 'bot', text: "No pude generar el análisis en este momento." }]);
    } finally {
      setLoading(false);
    }
  };

  // --- RENDERIZADO (HTML) ---
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-gray-200 flex flex-col shadow-sm z-20 hidden md:flex">
        <div className="p-4 border-b bg-white flex justify-between items-center">
          <h2 className="font-bold text-xl text-blue-600">EduBot 🎓</h2>
          <button onClick={handleNewChat} className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 shadow">
            +
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => handleSelectSession(session.id)}
              className={`w-full text-left p-3 rounded-lg text-sm transition-all ${
                currentSessionId === session.id ? 'bg-blue-50 text-blue-700 font-semibold' : 'hover:bg-gray-100'
              }`}
            >
              <div className="truncate">{session.title || "Nueva conversación"}</div>
            </button>
          ))}
        </div>
        <div className="p-4 border-t">
          <button onClick={handleLogout} className="w-full text-red-600 hover:bg-red-50 p-2 rounded text-sm font-bold">
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Chat Principal */}
      <main className="flex-1 flex flex-col h-full relative bg-white">
        <header className="h-16 border-b flex items-center px-6 bg-white shadow-sm z-10 justify-between">
          <h1 className="text-lg font-bold text-gray-800">
            {currentSessionId ? "Continuando conversación..." : "Nueva Conversación"}
          </h1>
          <button onClick={handleLogout} className="md:hidden text-red-500 text-sm">Salir</button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-gray-50 scroll-smooth">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-60">
              <span className="text-6xl mb-4">🤖</span>
              <p>Sube un archivo o escribe para comenzar</p>
            </div>
          )}

          {messages.map((msg, index) => (
            <div key={index} className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] lg:max-w-[75%] ${msg.isQuiz ? 'w-full max-w-2xl' : ''}`}>
                
                {/* --- AQUÍ ES DONDE TENÍAS LA DUDA (YA ESTÁ ARREGLADO) --- */}
                {msg.isQuiz ? (
                  <QuizRenderer 
                    quizData={msg.quizData} 
                    onRequestFeedback={handleRequestFeedback} // <--- ¡AQUÍ ESTÁ LA MAGIA!
                  />
                ) : (
                  <div className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed ${
                    msg.sender === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'
                  }`}>
                    <ReactMarkdown 
                      components={{
                        p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc ml-5" {...props} />,
                        li: ({node, ...props}) => <li className="mb-1" {...props} />,
                        strong: ({node, ...props}) => <span className="font-bold" {...props} />
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  </div>
                )}

              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start w-full animate-pulse">
               <div className="bg-gray-200 text-gray-500 px-4 py-3 rounded-2xl rounded-bl-sm text-sm">Pensando...</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-white border-t">
          <div className="max-w-4xl mx-auto flex gap-3 items-end">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,.docx,.jpg,.png" />
            
            <button onClick={handleClickUpload} disabled={loading} className="p-3 text-gray-500 hover:bg-blue-50 rounded-xl transition">
              📎
            </button>

            <div className="flex-1 bg-gray-100 rounded-xl flex items-center px-4 py-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Escribe un mensaje..."
                className="flex-1 bg-transparent border-none focus:ring-0 outline-none h-10"
                disabled={loading}
              />
            </div>
            
            <button onClick={handleSendMessage} disabled={loading || !input.trim()} className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-md">
              Enviar
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}