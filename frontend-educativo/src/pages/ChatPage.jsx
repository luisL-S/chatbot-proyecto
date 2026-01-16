import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { authService } from '../services/authService';
import { chatService } from '../services/chatService';
import { uploadFileForQuiz } from '../services/readingService';
import QuizDisplay from '../components/QuizDisplay';

// --- COMPONENTE DE TARJETA DE OPCIÓN ---
const OptionCard = ({ icon, title, desc, onClick, color }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center p-6 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-all hover:scale-105 cursor-pointer w-full md:w-64 text-center group`}
  >
    <div className={`text-4xl mb-4 p-4 rounded-full ${color} text-white group-hover:opacity-90 transition`}>
      {icon}
    </div>
    <h3 className="font-bold text-gray-800 text-lg mb-2">{title}</h3>
    <p className="text-gray-500 text-sm">{desc}</p>
  </button>
);

export default function ChatPage({ onLogout }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  
  // Estados para Modales de Creación
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('text'); 
  const [modalInput, setModalInput] = useState('');

  // --- NUEVO ESTADO: MODAL DE BORRADO ---
  const [chatToDelete, setChatToDelete] = useState(null); // Guarda el ID del chat a borrar

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => { loadSessions(); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const loadSessions = async () => {
    try {
      const data = await chatService.getAllSessions();
      setSessions(data);
    } catch (error) { console.error("Error historial:", error); }
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
          if (msg.role === 'model') {
             const content = msg.content.trim();
             // AQUÍ ESTÁ EL CAMBIO: Aceptamos Arrays '[' o Objetos '{'
             if (content.startsWith('{') || content.startsWith('[')) {
                const parsed = JSON.parse(content);
                // Validamos si es una lista (formato nuevo) o un objeto (formato viejo)
                if (Array.isArray(parsed) || (parsed.title && parsed.questions)) {
                  quizData = parsed;
                  isQuiz = true;
                }
             }
          }
        } catch (e) {}
        return { sender: msg.role === 'user' ? 'user' : 'bot', text: msg.content, isQuiz, quizData };
      });
      setMessages(formattedMessages);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const handleNewChat = () => { setCurrentSessionId(null); setMessages([]); };
  const handleLogout = () => { authService.logout(); onLogout(); };

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    const originalInput = input;
    setMessages(prev => [...prev, { sender: 'user', text: originalInput }]);
    setInput('');
    setLoading(true);

    try {
      const response = await chatService.sendMessage(originalInput, currentSessionId);
      setMessages(prev => [...prev, { sender: 'bot', text: response.response, isQuiz: false }]);
      if (!currentSessionId && response.session_id) {
        setCurrentSessionId(response.session_id);
        await loadSessions();
      }
    } catch (error) { setMessages(prev => [...prev, { sender: 'bot', text: "⚠️ Error de conexión." }]); } 
    finally { setLoading(false); }
  };

  const handleClickUpload = () => { fileInputRef.current.click(); };
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    processNewInteraction(
      `📎 Analizando archivo: ${file.name}...`,
      () => uploadFileForQuiz(file, currentSessionId)
    );
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openModal = (mode) => {
    setModalMode(mode);
    setModalInput('');
    setModalOpen(true);
  };

  const handleSubmitModal = async () => {
    if (!modalInput.trim()) return;
    setModalOpen(false);
    
    const token = localStorage.getItem('token');
    const endpoint = modalMode === 'text' ? 'text-quiz' : 'generate-reading';
    const bodyKey = modalMode === 'text' ? 'text' : 'topic';
    const userTextDisplay = modalMode === 'text' ? `📝 Analizando texto pegado...` : `✨ Generando lección sobre: ${modalInput}...`;

    setLoading(true);
    setMessages(prev => [...prev, { sender: 'user', text: userTextDisplay }]);

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/reading/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ [bodyKey]: modalInput, session_id: currentSessionId })
      });

      if (!response.ok) throw new Error("Error en servidor");
      const data = await response.json();

      if (modalMode === 'topic' && data.reading) {
        setMessages(prev => [...prev, { sender: 'bot', text: `📚 **Lectura Generada:**\n\n${data.reading}` }]);
      }
      setMessages(prev => [...prev, { sender: 'bot', text: "Aquí tienes tu examen:", quizData: data.quiz, isQuiz: true }]);

      if (!currentSessionId && data.session_id) {
        setCurrentSessionId(data.session_id);
        await loadSessions();
      }
    } catch (error) {
      setMessages(prev => [...prev, { sender: 'bot', text: "❌ Ocurrió un error al procesar tu solicitud." }]);
    } finally {
      setLoading(false);
    }
  };

  const processNewInteraction = async (userText, apiCall) => {
    setLoading(true);
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    try {
      const data = await apiCall();
      setMessages(prev => [...prev, { sender: 'bot', text: "He generado un cuestionario:", quizData: data.quiz, isQuiz: true }]);
      if (!currentSessionId && data.session_id) {
        setCurrentSessionId(data.session_id);
        await loadSessions();
      }
    } catch (e) {
      setMessages(prev => [...prev, { sender: 'bot', text: "❌ Error al procesar." }]);
    } finally { setLoading(false); }
  };

  const handleRequestFeedback = async (score, total, mistakes) => {
    const prompt = `Actúa como tutor. Terminé el examen. Nota: ${score}/${total}. Errores: ${mistakes}. Dame retroalimentación detallada y pedagógica.`;
    setMessages(prev => [...prev, { sender: 'user', text: "📊 ¿Podrías darme retroalimentación?" }]);
    setLoading(true);
    try {
      const res = await chatService.sendMessage(prompt, currentSessionId);
      setMessages(prev => [...prev, { sender: 'bot', text: res.response, isQuiz: false }]);
    } catch (e) { } finally { setLoading(false); }
  };

  // --- LÓGICA DE BORRADO ---
  const handleClickDelete = (e, chatId) => {
    e.stopPropagation(); // Evita abrir el chat
    setChatToDelete(chatId); // Abre el modal guardando el ID
  };

  const confirmDelete = async () => {
    if (!chatToDelete) return;
    
    try {
      await chatService.deleteSession(chatToDelete);
      // Eliminar de la lista visual
      setSessions(prev => prev.filter(chat => chat.id !== chatToDelete));
      
      // Si borramos el chat que estábamos viendo, limpiamos la pantalla
      if (currentSessionId === chatToDelete) {
        setCurrentSessionId(null);
        setMessages([]);
      }
    } catch (error) {
      console.error("Error al borrar", error);
    } finally {
      setChatToDelete(null); // Cerrar modal
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      
      {/* SIDEBAR */}
      <aside className="w-72 bg-white border-r border-gray-200 flex flex-col shadow-sm z-20 hidden md:flex">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="font-bold text-xl text-blue-600">EduBot 🎓</h2>
          <button onClick={handleNewChat} className="bg-blue-600 text-white w-8 h-8 rounded-full hover:bg-blue-700 shadow flex items-center justify-center font-bold text-xl pb-1">+</button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.map((s) => (
            <div 
              key={s.id} 
              className={`group flex items-center justify-between w-full p-2 rounded-lg text-sm transition-all cursor-pointer ${
                currentSessionId === s.id 
                  ? 'bg-blue-50 text-blue-700 font-semibold border-l-4 border-blue-600' 
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              onClick={() => handleSelectSession(s.id)}
            >
              <div className="truncate flex-1 pr-2">
                <div className="truncate font-medium">{s.title || "Chat Nuevo"}</div>
                <div className="text-xs text-gray-400">{new Date(s.created_at).toLocaleDateString()}</div>
              </div>
              
              {/* Botón Borrar mejorado */}
              <button
                onClick={(e) => handleClickDelete(e, s.id)}
                className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                title="Borrar chat"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
        <div className="p-4 border-t"><button onClick={handleLogout} className="w-full text-red-600 font-bold text-sm">🚪 Cerrar Sesión</button></div>
      </aside>

      {/* MAIN CHAT */}
      <main className="flex-1 flex flex-col h-full relative bg-white">
        <header className="h-16 border-b flex items-center px-6 justify-between shadow-sm z-10">
          <h1 className="text-lg font-bold text-gray-800">{currentSessionId ? "Conversación Activa" : "Nueva Lección"}</h1>
          <button onClick={handleLogout} className="md:hidden text-red-500 text-sm">Salir</button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-gray-50 scroll-smooth">
          {messages.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center h-full animate-fade-in-up">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">¡Bienvenido a EduBot! 👋</h2>
              <p className="text-gray-500 mb-10 text-center max-w-md">Elige cómo quieres aprender hoy.</p>
              
              <div className="flex flex-col md:flex-row gap-6 w-full max-w-4xl justify-center px-4">
                <OptionCard icon="📂" title="Subir Archivo" desc="Analizo PDFs, Word o Imágenes." color="bg-blue-500" onClick={handleClickUpload} />
                <OptionCard icon="📝" title="Pegar Texto" desc="Pega un artículo o ensayo aquí." color="bg-green-500" onClick={() => openModal('text')} />
                <OptionCard icon="✨" title="Crear Lección" desc="Dime un tema y te enseño." color="bg-purple-500" onClick={() => openModal('topic')} />
              </div>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div key={index} className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] lg:max-w-[75%] ${msg.isQuiz ? 'w-full max-w-2xl' : ''}`}>
                  {msg.isQuiz ? (
                    <QuizDisplay quizData={msg.quizData} />
                  ) : (
                    <div className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'}`}>
                      <ReactMarkdown components={{ p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />, strong: ({node, ...props}) => <span className="font-bold" {...props} /> }}>{msg.text}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          {loading && <div className="flex justify-start w-full animate-pulse"><div className="bg-gray-200 text-gray-500 px-4 py-3 rounded-2xl text-sm">🤖 Generando contenido...</div></div>}
          <div ref={messagesEndRef} />
        </div>

        {/* INPUT AREA */}
        <div className="p-4 bg-white border-t">
          <div className="max-w-4xl mx-auto flex gap-3 items-end">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,.docx,.jpg" />
            <button onClick={handleClickUpload} disabled={loading} className="p-3 text-gray-500 hover:bg-blue-50 rounded-xl transition">📎</button>
            <div className="flex-1 bg-gray-100 rounded-xl flex items-center px-4 py-2">
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Escribe un mensaje..." className="flex-1 bg-transparent border-none focus:ring-0 outline-none h-10" disabled={loading} />
            </div>
            <button onClick={handleSendMessage} disabled={loading || !input.trim()} className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-md">Enviar</button>
          </div>
        </div>
      </main>

      {/* MODAL 1: TEXTO/TEMA */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="text-xl font-bold mb-4 text-gray-800">{modalMode === 'text' ? '📝 Pegar Texto' : '✨ Nueva Lección'}</h3>
            {modalMode === 'text' ? (
              <textarea className="w-full h-40 border border-gray-300 rounded-lg p-3 outline-none resize-none text-sm" placeholder="Pega aquí el texto..." value={modalInput} onChange={(e) => setModalInput(e.target.value)} />
            ) : (
              <input type="text" className="w-full border border-gray-300 rounded-lg p-3 outline-none" placeholder="Ej: Fotosíntesis..." value={modalInput} onChange={(e) => setModalInput(e.target.value)} autoFocus />
            )}
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg font-medium">Cancelar</button>
              <button onClick={handleSubmitModal} className={`px-6 py-2 text-white rounded-lg font-bold shadow-md hover:scale-105 transition ${modalMode === 'text' ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700'}`}>{modalMode === 'text' ? 'Generar Examen' : 'Crear Lección'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRMACIÓN DE BORRADO (NUEVO) */}
      {chatToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center transform transition-all scale-100">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <span className="text-2xl">🗑️</span>
            </div>
            <h3 className="text-lg leading-6 font-bold text-gray-900 mb-2">
              ¿Borrar conversación?
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Esta acción no se puede deshacer. Perderás el historial y los exámenes de este chat.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setChatToDelete(null)}
                className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition focus:outline-none"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold shadow-md transition focus:outline-none"
              >
                Sí, borrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}