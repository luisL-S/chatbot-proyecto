import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from 'react-markdown';
import {
  Upload, FileText, BookOpen, Menu, X,
  GraduationCap, LogOut, Play, CheckCircle, RotateCcw,
  AlertCircle, Trash2, ArrowRight
} from "lucide-react";

export default function ChatPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // --- ESTADOS ---
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Vista actual: 'menu' | 'lesson' | 'quiz' | 'score'
  const [view, setView] = useState('menu');

  // Datos
  const [lessonContent, setLessonContent] = useState("");
  const [quizData, setQuizData] = useState([]);
  const [currentTopic, setCurrentTopic] = useState("");

  // Quiz
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState("");

  // Visual
  const [selectedOption, setSelectedOption] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const [isLocked, setIsLocked] = useState(false); // Bloquea feedback

  // Modales
  const [modals, setModals] = useState({ paste: false, topic: false });
  const [inputs, setInputs] = useState({ text: "", topic: "" });

  const getToken = () => localStorage.getItem('token');

  // --- CARGA INICIAL ---
  useEffect(() => { loadHistoryList(); }, []);

  // 1. GESTIÓN HISTORIAL
  const loadHistoryList = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/reading/history', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (res.ok) setHistory(await res.json());
    } catch (e) { console.error("Error historial", e); }
  };

  const loadHistoryItem = async (id) => {
    setLoading(true);
    setMobileMenu(false);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/reading/history/${id}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });

      if (!res.ok) throw new Error("Error cargando lección");

      const data = await res.json();

      // Restaurar estado
      setLessonContent(data.content || "");
      setQuizData(data.quiz.questions || data.quiz);
      setCurrentTopic(data.topic);

      // Reiniciar
      setScore(0);
      setCurrentQ(0);
      resetQuestionState();

      if (data.content) setView('lesson');
      else setView('quiz');

    } catch (e) {
      setErrorMsg("No se pudo cargar la lección antigua.");
      setTimeout(() => setErrorMsg(""), 3000);
    } finally {
      setLoading(false);
    }
  };

  const deleteHistoryItem = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("¿Borrar esta lección?")) return;
    try {
      await fetch(`http://127.0.0.1:8000/api/reading/history/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      loadHistoryList();
    } catch (e) { console.error(e); }
  };

  // 2. LÓGICA DE RESPUESTA
  const handleAnswer = (option, correct) => {
    if (isLocked) return;
    setIsLocked(true);

    const correctAns = option === correct;
    setSelectedOption(option);
    setIsCorrect(correctAns);
  };

  const nextQuestion = () => {
    if (isCorrect) setScore(s => s + 1);

    const next = currentQ + 1;
    if (next < quizData.length) {
      setCurrentQ(next);
      resetQuestionState();
    } else {
      finishQuiz(isCorrect ? score + 1 : score);
    }
  };

  const resetQuestionState = () => {
    setSelectedOption(null);
    setIsCorrect(null);
    setIsLocked(false);
  };

  const finishQuiz = async (finalScore) => {
    setView('score');
    setFeedback("Analizando desempeño...");
    try {
      const topic = currentTopic || "Comprensión";
      const res = await fetch('http://127.0.0.1:8000/api/reading/feedback-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ score: finalScore, total: quizData.length, topic })
      });
      if (res.ok) {
        const data = await res.json();
        setFeedback(data.feedback);
      }
    } catch (e) {
      setFeedback("¡Buen esfuerzo! Sigue practicando.");
    }
  };

  // 3. API CALLS
  const apiCall = async (endpoint, body = null, isFile = false) => {
    setLoading(true);
    setErrorMsg("");
    setModals({ paste: false, topic: false });

    try {
      const headers = { 'Authorization': `Bearer ${getToken()}` };
      if (!isFile) headers['Content-Type'] = 'application/json';

      const res = await fetch(`http://127.0.0.1:8000/api/reading/${endpoint}`, {
        method: 'POST',
        headers,
        body: isFile ? body : JSON.stringify(body)
      });

      if (!res.ok) throw new Error("Error servidor");

      const data = await res.json();

      setQuizData(data.quiz.questions || data.quiz);
      setCurrentTopic(inputs.topic || "Nuevo Tema");

      if (data.text || data.content) {
        setLessonContent(data.text || data.content);
        setView('lesson');
      } else {
        setView('quiz');
      }
      loadHistoryList();

    } catch (e) {
      setErrorMsg("Ocurrió un error. Intenta de nuevo.");
      setTimeout(() => setErrorMsg(""), 4000);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append("file", file);
      apiCall('upload', formData, true);
    }
  };

  const resetApp = () => {
    setView('menu');
    setScore(0);
    setCurrentQ(0);
    setLessonContent("");
    setQuizData([]);
    resetQuestionState();
    loadHistoryList();
  };

  // --- RENDERIZADO (LAYOUT CORREGIDO) ---
  return (
    // Usamos flex-col en móvil y flex-row en desktop para que el sidebar no tape el contenido
    <div className="flex h-screen bg-[#F9F7F2] font-sans text-[#374151] overflow-hidden">

      {/* SIDEBAR */}
      {/* En desktop es relativo (bloque normal) para empujar el contenido. En móvil es absolute. */}
      <aside className={`
          absolute md:relative z-30 w-72 h-full bg-[#F2EFE9] border-r border-[#E5E0D8] 
          flex flex-col shadow-xl md:shadow-none transition-transform duration-300
          ${mobileMenu ? "translate-x-0" : "-translate-x-full"} md:translate-x-0
      `}>
        <div onClick={resetApp} className="p-6 border-b border-[#E5E0D8] flex items-center gap-3 cursor-pointer hover:bg-[#EAE6DE] transition">
          <div className="bg-purple-600 text-white p-2 rounded-lg">
            <GraduationCap size={20} />
          </div>
          <span className="font-bold text-xl tracking-tight text-gray-800">EduBot</span>
          <button onClick={() => setMobileMenu(false)} className="md:hidden ml-auto text-gray-500"><X /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <h3 className="text-xs font-bold text-gray-500 uppercase mb-4 tracking-wider px-2">Biblioteca</h3>
          {history.length === 0 && <p className="text-sm text-gray-400 px-2 italic">Sin lecturas recientes.</p>}

          <div className="space-y-2">
            {history.map((h) => (
              <div
                key={h.id}
                onClick={() => loadHistoryItem(h.id)}
                className="group flex justify-between items-center p-3 text-sm bg-white rounded-xl border border-[#E5E0D8] hover:border-purple-300 hover:shadow-sm cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <BookOpen size={16} className="text-purple-400 shrink-0" />
                  <span className="truncate font-medium text-gray-700">{h.topic || "Sin título"}</span>
                </div>
                <button
                  onClick={(e) => deleteHistoryItem(e, h.id)}
                  className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-[#E5E0D8]">
          <button onClick={() => { localStorage.removeItem("token"); navigate("/login"); }} className="flex items-center gap-2 text-gray-500 font-medium w-full p-3 hover:bg-white rounded-xl transition-colors">
            <LogOut size={18} /> <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 flex flex-col h-full w-full relative">
        {/* Header Móvil */}
        <header className="md:hidden p-4 bg-[#F9F7F2] border-b border-[#E5E0D8] flex justify-between items-center z-20">
          <button onClick={() => setMobileMenu(true)}><Menu className="text-gray-700" /></button>
          <span className="font-bold text-purple-700">EduBot</span>
          <div className="w-6" />
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-12 relative scroll-smooth">

          {errorMsg && (
            <div className="fixed top-6 right-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-bounce z-50">
              <AlertCircle size={20} /> {errorMsg}
            </div>
          )}

          {loading && (
            <div className="absolute inset-0 bg-[#F9F7F2]/90 z-40 flex flex-col items-center justify-center backdrop-blur-sm">
              <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
              <p className="mt-6 font-medium text-gray-600 animate-pulse">Preparando material...</p>
            </div>
          )}

          {/* VISTA 1: MENÚ */}
          {view === 'menu' && !loading && (
            <div className="max-w-5xl mx-auto flex flex-col justify-center h-full">
              <div className="text-center mb-16">
                <h1 className="text-4xl md:text-5xl font-extrabold text-gray-800 mb-6 tracking-tight">
                  Tu espacio de <span className="text-purple-600">Aprendizaje</span>
                </h1>
                <p className="text-xl text-gray-500 max-w-2xl mx-auto">
                  Selecciona una herramienta para comenzar.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
                <CardButton
                  icon={<Upload size={32} className="text-white" />}
                  title="Analizar Archivo"
                  desc="PDF, Word o Imágenes"
                  color="bg-purple-600"
                  onClick={() => fileInputRef.current.click()}
                >
                  <input type="file" ref={fileInputRef} className="hidden" onChange={handleUpload} accept=".pdf,.docx,.png,.jpg,.jpeg" />
                </CardButton>

                <CardButton
                  icon={<FileText size={32} className="text-white" />}
                  title="Pegar Texto"
                  desc="Noticias o artículos"
                  color="bg-blue-600"
                  onClick={() => setModals({ ...modals, paste: true })}
                />

                <CardButton
                  icon={<BookOpen size={32} className="text-white" />}
                  title="Crear Lección"
                  desc="Generada por IA"
                  color="bg-pink-600"
                  onClick={() => setModals({ ...modals, topic: true })}
                />
              </div>
            </div>
          )}

          {/* VISTA 2: LECCIÓN */}
          {view === 'lesson' && (
            <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 pb-20">
              <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-[#E5E0D8]">
                <div className="flex flex-col md:flex-row justify-between items-start border-b border-gray-100 pb-6 mb-8 gap-4">
                  <div>
                    <span className="text-sm font-bold text-purple-600 uppercase tracking-wider">Lectura</span>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mt-1">{currentTopic}</h2>
                  </div>
                  <button onClick={() => setView('quiz')} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition shadow-lg shadow-purple-200 shrink-0">
                    <span>Comenzar Examen</span> <ArrowRight size={18} />
                  </button>
                </div>

                <div className="prose prose-lg prose-slate text-[#374151] leading-relaxed max-w-none font-serif">
                  <ReactMarkdown>{lessonContent}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}

          {/* VISTA 3: QUIZ */}
          {view === 'quiz' && quizData.length > 0 && (
            <div className="max-w-2xl mx-auto mt-4 pb-20 animate-in zoom-in-95">
              <div className="mb-6 flex justify-between items-end text-sm font-bold text-gray-500">
                <span>Pregunta {currentQ + 1} de {quizData.length}</span>
                <span>Aciertos: {score}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
                <div className="bg-purple-600 h-2 rounded-full transition-all duration-500" style={{ width: `${((currentQ + 1) / quizData.length) * 100}%` }}></div>
              </div>

              <div className="bg-white rounded-3xl shadow-sm border border-[#E5E0D8] overflow-hidden">
                <div className="p-8 md:p-10">
                  <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-8 leading-snug">
                    {quizData[currentQ].question}
                  </h3>

                  <div className="space-y-4">
                    {quizData[currentQ].options.map((op, i) => {
                      let btnStyle = "border-[#E5E0D8] bg-white hover:border-purple-400 hover:bg-[#FAF5FF]";
                      if (selectedOption === op) {
                        btnStyle = isCorrect
                          ? "border-green-500 bg-green-50 text-green-800 ring-1 ring-green-500"
                          : "border-red-500 bg-red-50 text-red-800 ring-1 ring-red-500";
                      } else if (isLocked && (op === quizData[currentQ].correctAnswer || op === quizData[currentQ].answer)) {
                        btnStyle = "border-green-500 bg-green-50 text-green-800 opacity-60";
                      }

                      return (
                        <button
                          key={i}
                          disabled={isLocked}
                          onClick={() => handleAnswer(op, quizData[currentQ].correctAnswer || quizData[currentQ].answer)}
                          className={`w-full text-left p-5 rounded-xl border-2 transition-all duration-200 text-lg ${btnStyle}`}
                        >
                          {op}
                        </button>
                      )
                    })}
                  </div>

                  {isLocked && (
                    <div className="mt-8 animate-in fade-in slide-in-from-top-2">
                      <div className="bg-[#FFFBEB] border border-[#FCD34D] p-5 rounded-xl text-[#92400E]">
                        <div className="flex items-center gap-2 font-bold mb-2">
                          <AlertCircle size={18} /> Explicación del Docente:
                        </div>
                        <p className="text-sm md:text-base leading-relaxed">
                          {quizData[currentQ].explanation || "La respuesta se deduce del análisis del texto."}
                        </p>
                      </div>

                      <button
                        onClick={nextQuestion}
                        className="mt-6 w-full bg-gray-900 hover:bg-black text-white py-4 rounded-xl font-bold text-lg flex justify-center items-center gap-2 transition"
                      >
                        Siguiente Pregunta <ArrowRight />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* VISTA 4: SCORE */}
          {view === 'score' && (
            <div className="max-w-lg mx-auto mt-10 text-center animate-in zoom-in">
              <div className="bg-white p-10 rounded-3xl shadow-xl border border-[#E5E0D8]">
                <div className="inline-block p-4 rounded-full bg-green-100 mb-6">
                  <CheckCircle className="text-green-600 w-12 h-12" />
                </div>

                <h2 className="text-3xl font-extrabold text-gray-800 mb-2">Resumen Final</h2>

                <div className="my-8 flex justify-center items-baseline gap-2">
                  <span className="text-7xl font-black text-purple-600">{score}</span>
                  <span className="text-2xl text-gray-400 font-bold">/ {quizData.length}</span>
                </div>

                <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-6 rounded-2xl text-left mb-8 shadow-inner">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">👨‍🏫</span>
                    <span className="text-slate-700 font-bold text-sm uppercase tracking-wider">Evaluación Personalizada</span>
                  </div>
                  <div className="prose prose-sm text-slate-600 leading-relaxed">
                    <ReactMarkdown>{feedback || "Generando análisis..."}</ReactMarkdown>
                  </div>
                </div>

                <button onClick={resetApp} className="w-full bg-gray-900 hover:bg-gray-800 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-lg">
                  <RotateCcw size={20} /> Volver al Inicio
                </button>
              </div>
            </div>
          )}
        </main>

        {/* MODALES */}
        {modals.paste && (
          <Modal title="Pegar Texto" close={() => setModals({ ...modals, paste: false })}>
            <textarea
              className="w-full h-48 border border-gray-300 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-gray-50 text-gray-700"
              placeholder="Pega aquí el contenido..."
              onChange={(e) => setInputs({ ...inputs, text: e.target.value })}
            />
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModals({ ...modals, paste: false })} className="px-5 py-2 text-gray-500 font-bold hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button onClick={() => apiCall('analyze-text', { text: inputs.text })} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md">Analizar</button>
            </div>
          </Modal>
        )}

        {modals.topic && (
          <Modal title="Crear Lección" close={() => setModals({ ...modals, topic: false })}>
            <input
              className="w-full border border-gray-300 p-4 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none bg-gray-50 text-gray-700"
              placeholder="Ej: Historia de la IA..."
              onChange={(e) => setInputs({ ...inputs, topic: e.target.value })}
            />
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModals({ ...modals, topic: false })} className="px-5 py-2 text-gray-500 font-bold hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button onClick={() => apiCall('create-lesson', { topic: inputs.topic })} className="px-6 py-2 bg-pink-600 text-white rounded-lg font-bold hover:bg-pink-700 shadow-md">Generar</button>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}

const CardButton = ({ icon, title, desc, color, onClick, children }) => (
  <div onClick={onClick} className="group relative bg-white border border-[#E5E0D8] rounded-3xl p-8 cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
    <div className={`w-16 h-16 ${color} rounded-2xl flex items-center justify-center mb-6 shadow-md group-hover:scale-110 transition-transform`}>
      {icon}
    </div>
    <h3 className="font-bold text-xl text-gray-800 mb-2">{title}</h3>
    <p className="text-gray-500">{desc}</p>
    {children}
  </div>
);

const Modal = ({ title, close, children }) => (
  <div className="fixed inset-0 bg-[#374151]/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
    <div className="bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl animate-in zoom-in-95">
      <h3 className="text-2xl font-bold mb-6 text-gray-800">{title}</h3>
      {children}
    </div>
  </div>
);