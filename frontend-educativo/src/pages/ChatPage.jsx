import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable'; // <-- CORRECCIÓN 1: Importación compatible con Vite
import ReactMarkdown from 'react-markdown';
import {
  Upload, FileText, BookOpen, Menu, X,
  GraduationCap, LogOut, Play, CheckCircle, RotateCcw,
  AlertCircle, Trash2, ArrowRight, UserPlus, FileQuestion,
  LayoutDashboard, User, Users, Shield, Lock, Volume2, StopCircle, Download, MessageCircle, Send
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// --- COMPONENTE DE TOOLTIP PERSONALIZADO ---
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload; // Aquí accedemos a todos los datos de esa barra
    return (
      <div className="bg-white p-3 border border-purple-100 shadow-xl rounded-xl z-50">
        <p className="font-bold text-purple-700 text-sm mb-1">{data.studentShort}</p>
        <p className="text-xs text-gray-600 font-medium mb-2">{data.topic}</p>
        <div className="flex items-center gap-2 border-t border-gray-100 pt-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded ${data.scoreNum >= 3 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            Nota: {data.scoreNum} / {data.total}
          </span>
          <span className="text-[10px] text-gray-400">{new Date(data.date).toLocaleDateString()}</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function ChatPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // --- ESTADOS ---
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [dashboardData, setDashboardData] = useState([]);
  const [mobileMenu, setMobileMenu] = useState(false);

  // --- ESTADO DE AUDIO ---
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speechRef = useRef(null);

  // Mensajes
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Control de Roles
  const [canTeach, setCanTeach] = useState(false);
  const [isTeacherMode, setIsTeacherMode] = useState(false);

  // Vista actual
  const [view, setView] = useState('menu');

  // Datos Lección
  const [currentLessonId, setCurrentLessonId] = useState(null);
  const [lessonContent, setLessonContent] = useState("");
  const [quizData, setQuizData] = useState([]);
  const [currentTopic, setCurrentTopic] = useState("");

  // --- ESTADOS DEL TUTOR ---
  const [showTutor, setShowTutor] = useState(false);
  const [tutorMessages, setTutorMessages] = useState([]); // [{sender: 'user', text: '...'}, {sender: 'bot', text: '...'}]
  const [tutorInput, setTutorInput] = useState("");
  const [tutorLoading, setTutorLoading] = useState(false);

  // Quiz
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState("");

  // Visual
  const [selectedOption, setSelectedOption] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const [isLocked, setIsLocked] = useState(false);

  // Modales
  const [modals, setModals] = useState({ paste: false, topic: false, upload: false, teacherAuth: false });
  const [inputs, setInputs] = useState({ text: "", topic: "", numQ: 5, assignTo: "", teacherCode: "", difficulty: "Medio" });
  const [selectedFile, setSelectedFile] = useState(null);

  const getToken = () => localStorage.getItem('token');

  // --- CARGA INICIAL ---
  useEffect(() => {
    loadHistoryList();
    checkUserRole();
  }, []);

  // --- SEGURIDAD ---
  const checkUserRole = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/reading/user/role', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCanTeach(data.role === 'teacher');
      }
    } catch (e) { console.error("Error verificando rol"); }
  };

  const handleTeacherPromotion = async () => {
    if (!inputs.teacherCode) return setErrorMsg("Ingresa el código.");
    setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/reading/admin/verify-teacher-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ code: inputs.teacherCode })
      });

      if (res.ok) {
        alert("✅ Identidad Verificada. Acceso Docente Concedido.");
        setModals({ ...modals, teacherAuth: false });
        window.location.reload();
      } else {
        setErrorMsg("Código Institucional Inválido ⛔");
      }
    } catch (e) { setErrorMsg("Error de conexión"); }
    finally { setLoading(false); }
  };

  // --- GESTIÓN DE DATOS ---
  const loadHistoryList = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/reading/history', { headers: { 'Authorization': `Bearer ${getToken()}` } });
      if (res.ok) setHistory(await res.json());
    } catch (e) { console.error(e); }
  };

  const loadTeacherDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/reading/teacher/dashboard', { headers: { 'Authorization': `Bearer ${getToken()}` } });
      if (res.ok) {
        const data = await res.json();
        // Procesamos datos para el gráfico
        const processedData = data.map(d => ({
          ...d,
          scoreNum: d.score === '-' ? 0 : Number(d.score), // Aseguramos que sea número
          studentShort: d.student.split('@')[0]
        }));
        setDashboardData(processedData);
        setView('dashboard');
      } else {
        setErrorMsg("Acceso denegado. No eres docente.");
      }
    } catch (e) { setErrorMsg("Error cargando panel"); }
    finally { setLoading(false); }
  };

  const loadHistoryItem = async (id) => {
    setLoading(true); setMobileMenu(false);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/reading/history/${id}`, { headers: { 'Authorization': `Bearer ${getToken()}` } });
      if (!res.ok) throw new Error("Error cargando");
      const data = await res.json();

      setCurrentLessonId(data.id);
      setLessonContent(data.content || "");
      setQuizData(data.quiz.questions || data.quiz);
      setCurrentTopic(data.topic);
      setScore(0); setCurrentQ(0); resetQuestionState();

      setView(data.content ? 'lesson' : 'quiz');
    } catch (e) { setErrorMsg("Error recuperando lección"); }
    finally { setLoading(false); }
  };

  const deleteHistoryItem = async (e, id) => {
    e.stopPropagation();
    if (!confirm("¿Borrar?")) return;
    await fetch(`http://127.0.0.1:8000/api/reading/history/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } });
    loadHistoryList();
  };

  // --- ACCIONES (CORREGIDA) ---
  const handleAction = async (type) => {
    setLoading(true); setErrorMsg(""); setSuccessMsg("");
    setModals({ paste: false, topic: false, upload: false, teacherAuth: false });

    try {
      const token = getToken();
      let url = "";
      let body;
      let headers = { 'Authorization': `Bearer ${token}` };

      // 1. CORRECCIÓN CLAVE: Asegurar que assign_to tenga el valor correcto
      // Si estoy en modo docente, uso lo que escribí en el input. Si no, es null.
      const targetEmail = isTeacherMode ? inputs.assignTo : null;

      const payload = {
        ...inputs,
        num_questions: parseInt(inputs.numQ),
        assign_to: targetEmail // <--- AQUÍ ESTABA EL ERROR (antes usábamos una variable vacía)
      };

      if (type === 'paste') {
        url = 'http://127.0.0.1:8000/api/reading/analyze-text';
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify({
          text: inputs.text,
          num_questions: payload.num_questions,
          difficulty: inputs.difficulty,
          assign_to: payload.assign_to
        });
      }
      else if (type === 'topic') {
        url = 'http://127.0.0.1:8000/api/reading/create-lesson';
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify({
          topic: inputs.topic,
          num_questions: payload.num_questions,
          difficulty: inputs.difficulty,
          assign_to: payload.assign_to
        });
      }
      else if (type === 'upload') {
        url = 'http://127.0.0.1:8000/api/reading/upload';
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("num_questions", payload.num_questions);
        formData.append("difficulty", inputs.difficulty);
        // Aseguramos que se envíe al backend
        if (payload.assign_to) formData.append("assign_to", payload.assign_to);
        body = formData;
      }

      const res = await fetch(url, { method: 'POST', headers: type === 'upload' ? { 'Authorization': `Bearer ${token}` } : headers, body });
      if (!res.ok) throw new Error("Error servidor");
      const data = await res.json();

      // 2. LÓGICA DE FLUJO CORREGIDA
      // Si enviamos un email (assign_to), SOLO mostramos mensaje y nos quedamos en el menú.
      if (payload.assign_to && payload.assign_to.trim() !== "") {
        setSuccessMsg(data.message || `¡Tarea enviada a ${payload.assign_to}!`);
        // NO cambiamos de vista (setView), así que nos quedamos en el inicio.
      } else {
        // Si NO pusimos email (es para mi), entonces SÍ abrimos la lección.
        setCurrentLessonId(data.lesson_id);
        setQuizData(data.quiz.questions || data.quiz);
        setLessonContent(data.text || data.content || "");
        setCurrentTopic(data.filename || inputs.topic || "Nuevo Tema");
        setView(data.text || data.content ? 'lesson' : 'quiz');
      }

      loadHistoryList();
      // Limpiamos los campos
      setInputs({ ...inputs, text: "", topic: "", assignTo: "" });
      setSelectedFile(null);

    } catch (e) { setErrorMsg("Ocurrió un error."); }
    finally { setLoading(false); }
  };

  // --- QUIZ ---
  const handleAnswer = (option, correct) => { if (isLocked) return; setIsLocked(true); const hit = option === correct; setSelectedOption(option); setIsCorrect(hit); };
  const nextQuestion = () => { if (isCorrect) setScore(s => s + 1); const next = currentQ + 1; if (next < quizData.length) { setCurrentQ(next); resetQuestionState(); } else { finishQuiz(isCorrect ? score + 1 : score); } };
  const resetQuestionState = () => { setSelectedOption(null); setIsCorrect(null); setIsLocked(false); };

  const finishQuiz = async (finalScore) => {
    setView('score'); setFeedback("Guardando...");
    try {
      const res = await fetch('http://127.0.0.1:8000/api/reading/feedback-analysis', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ score: finalScore, total: quizData.length, topic: currentTopic, lesson_id: currentLessonId })
      });
      if (res.ok) { const data = await res.json(); setFeedback(data.feedback); }
      loadHistoryList();
    } catch (e) { setFeedback("Error guardando nota."); }
  };

  const resetApp = () => { setView('menu'); setScore(0); setCurrentQ(0); setLessonContent(""); setQuizData([]); resetQuestionState(); loadHistoryList(); };

  // --- AUDIO MEJORADO (FILTRA SÍMBOLOS) ---
  const handleSpeak = () => {
    if (!lessonContent) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    // --- LIMPIEZA DE TEXTO ---
    // Creamos una versión "limpia" solo para el audio
    const cleanText = lessonContent
      .replace(/[_*-]{3,}/g, "")       // 1. Quita líneas divisorias (___ o --- o ***)
      .replace(/[#*`]/g, "")           // 2. Quita símbolos de Markdown (#, *, `)
      .replace(/\[(.*?)\]\(.*?\)/g, "$1") // 3. Si hay links, lee solo el texto, no la URL
      .trim();                         // 4. Quita espacios vacíos al inicio/final

    const utterance = new SpeechSynthesisUtterance(cleanText); // <--- Usamos el texto limpio
    utterance.lang = "es-ES";
    utterance.rate = 1.0;

    utterance.onend = () => setIsSpeaking(false);

    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  // ---- CORRECCIÓN 2: DESCARGA DE PDF ----
  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.text("Reporte de Calificaciones - EduBot", 14, 20);

    const tableColumn = ["Fecha", "Alumno", "Lección", "Nota", "Estado"];
    const tableRows = dashboardData.map(row => [
      new Date(row.date).toLocaleDateString(),
      row.student,
      row.topic,
      `${row.score} / ${row.total}`,
      row.status === 'completed' ? 'Completado' : 'Pendiente'
    ]);

    // Usamos autoTable(doc, ...)
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 30,
    });

    doc.save("Reporte_EduBot.pdf");
  };

  // --- FUNCIÓN CONSULTAR TUTOR ---
  const handleAskTutor = async (e) => {
    e.preventDefault();
    if (!tutorInput.trim()) return;

    const userQ = tutorInput;
    // 1. Agregamos mensaje del usuario
    setTutorMessages(prev => [...prev, { sender: 'user', text: userQ }]);
    setTutorInput("");
    setTutorLoading(true);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/reading/ask-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ question: userQ, context: lessonContent })
      });

      if (res.ok) {
        const data = await res.json();
        setTutorMessages(prev => [...prev, { sender: 'bot', text: data.answer }]);
      } else {
        // AGREGAR ESTO: Si el servidor falla (500), avisar al usuario
        setTutorMessages(prev => [...prev, { sender: 'bot', text: "El profesor está descansando (Error del servidor)." }]);
      }
    } catch (err) {
      setTutorMessages(prev => [...prev, { sender: 'bot', text: "Lo siento, hubo un error de conexión." }]);
    } finally {
      setTutorLoading(false);
    }
  };

  // --- RENDER ---
  return (
    <div className="flex h-screen bg-[#F9F7F2] font-sans text-[#374151] overflow-hidden">

      <aside className={`absolute md:relative z-30 w-72 h-full bg-[#F2EFE9] border-r border-[#E5E0D8] flex flex-col shadow-xl md:shadow-none transition-transform duration-300 ${mobileMenu ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}>
        <div onClick={resetApp} className="p-6 border-b border-[#E5E0D8] flex items-center gap-3 cursor-pointer hover:bg-[#EAE6DE]">
          <GraduationCap className="text-purple-600" size={24} />
          <span className="font-bold text-xl text-gray-800">EduBot</span>
          <button onClick={() => setMobileMenu(false)} className="md:hidden ml-auto"><X /></button>
        </div>

        {canTeach ? (
          <div className="px-4 mt-4 animate-in fade-in">
            <div
              onClick={() => { setIsTeacherMode(!isTeacherMode); if (!isTeacherMode && view === 'dashboard') setView('menu'); }}
              className={`p-3 rounded-xl border cursor-pointer flex items-center gap-3 transition-all ${isTeacherMode ? "bg-purple-100 border-purple-300 text-purple-800" : "bg-white border-gray-200 text-gray-600"}`}
            >
              {isTeacherMode ? <Users size={20} /> : <User size={20} />}
              <div className="flex flex-col">
                <span className="text-xs font-bold uppercase opacity-70">Modo Actual</span>
                <span className="font-bold">{isTeacherMode ? "Docente" : "Alumno"}</span>
              </div>
            </div>

            {isTeacherMode && (
              <button onClick={loadTeacherDashboard} className="w-full mt-2 flex items-center gap-2 p-2 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700 transition shadow-sm">
                <LayoutDashboard size={16} /> Resultados Alumnos
              </button>
            )}
          </div>
        ) : (
          <div className="px-4 mt-4">
            <button onClick={() => setModals({ ...modals, teacherAuth: true })} className="w-full p-2 text-xs text-gray-500 hover:text-purple-600 flex gap-2 items-center justify-center border border-gray-200 rounded hover:border-purple-300 bg-white shadow-sm transition">
              <Shield size={12} /> Soy Docente
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <h3 className="text-xs font-bold text-gray-400 uppercase mb-3 px-2">Biblioteca</h3>
          {history.map(h => (
            <div key={h.id} onClick={() => loadHistoryItem(h.id)} className="group flex justify-between p-3 mb-2 text-sm bg-white rounded-xl border hover:border-purple-300 cursor-pointer relative">
              <div className="flex flex-col w-40 overflow-hidden">
                <span className="truncate font-medium">{h.topic}</span>
                {h.is_assignment && <span className="text-[10px] text-blue-600 font-bold bg-blue-50 w-fit px-2 rounded-full border border-blue-100 mt-1">Tarea</span>}
                {h.score !== undefined && h.score !== null && <span className="text-[10px] text-green-600 font-bold">Nota: {h.score} pts</span>}
              </div>
              <button onClick={(e) => deleteHistoryItem(e, h.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-[#E5E0D8]"><button onClick={() => { localStorage.removeItem("token"); navigate("/login"); }} className="flex items-center gap-2 text-gray-500 w-full p-2 hover:bg-white rounded-lg"><LogOut size={18} /> Salir</button></div>
      </aside>

      <div className="flex-1 flex flex-col h-full relative overflow-hidden">
        <header className="md:hidden p-4 bg-[#F9F7F2] border-b flex justify-between items-center z-20"><button onClick={() => setMobileMenu(true)}><Menu /></button><span className="font-bold text-purple-700">EduBot</span><div className="w-6" /></header>
        <main className="flex-1 overflow-y-auto p-6 md:p-12 relative">

          {errorMsg && <div className="fixed top-6 right-6 bg-red-100 text-red-800 px-4 py-2 rounded-lg z-50 animate-bounce flex gap-2"><AlertCircle /> {errorMsg}</div>}
          {successMsg && <div className="fixed top-6 right-6 bg-green-100 text-green-800 px-4 py-2 rounded-lg z-50 animate-bounce flex gap-2"><CheckCircle /> {successMsg}</div>}
          {loading && <div className="absolute inset-0 bg-[#F9F7F2]/90 z-40 flex flex-col items-center justify-center"><div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" /><p className="mt-4 font-medium text-gray-600">Procesando...</p></div>}

          {view === 'menu' && !loading && (
            <div className="max-w-4xl mx-auto flex flex-col justify-center h-full text-center">
              <h1 className="text-4xl md:text-5xl font-extrabold text-gray-800 mb-6">EduBot <span className="text-purple-600">LMS</span></h1>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <OptionCard icon={<Upload />} title="Subir Archivo" onClick={() => fileInputRef.current.click()} color="bg-purple-600">
                  <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => { if (e.target.files[0]) { setSelectedFile(e.target.files[0]); setModals({ ...modals, upload: true }); } }} accept=".pdf,.docx,.png,.jpg,.jpeg" />
                </OptionCard>
                <OptionCard icon={<FileText />} title="Pegar Texto" onClick={() => setModals({ ...modals, paste: true })} color="bg-blue-600" />
                <OptionCard icon={<BookOpen />} title="Crear Lección" onClick={() => setModals({ ...modals, topic: true })} color="bg-pink-600" />
              </div>
            </div>
          )}

          {view === 'dashboard' && (
            <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 pb-20">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-3"><LayoutDashboard className="text-purple-600" /> Panel de Resultados</h2>
                <div className="flex gap-2">
                  <button onClick={downloadPDF} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm">
                    <Download size={18} /> PDF
                  </button>
                  <button onClick={resetApp} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-bold">
                    Volver
                  </button>
                </div>
              </div>

              {/* CORRECCIÓN 3: barSize en la gráfica */}
              {dashboardData.length > 0 && (
                <div className="bg-white p-6 rounded-3xl border border-[#E5E0D8] shadow-sm mb-8 h-80 w-full">
                  <h3 className="text-sm font-bold text-gray-500 uppercase mb-4">Rendimiento General</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboardData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />

                      {/* --- CAMBIO CLAVE AQUÍ --- */}
                      {/* 1. Usamos 'id' en dataKey para que cada barra sea única */}
                      {/* 2. Usamos tickFormatter para convertir ese ID raro en el nombre del alumno */}
                      <XAxis
                        dataKey="id"
                        tickFormatter={(val) => {
                          const item = dashboardData.find(d => d.id === val);
                          return item ? item.studentShort : val;
                        }}
                        tick={{ fontSize: 12, fill: '#6B7280' }}
                        axisLine={false}
                        tickLine={false}
                      />

                      <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} allowDecimals={false} />

                      {/* Tu tooltip personalizado funcionará perfecto ahora */}
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F3F4F6', opacity: 0.5 }} />

                      <Bar dataKey="scoreNum" name="Nota" radius={[6, 6, 0, 0]} barSize={60}>
                        {dashboardData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.scoreNum >= entry.total / 2 ? '#9333ea' : '#f87171'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="bg-white rounded-3xl shadow-sm border border-[#E5E0D8] overflow-hidden">
                {dashboardData.length === 0 ? (
                  <div className="p-12 text-center text-gray-400">No hay datos para mostrar.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="p-4 text-xs font-bold text-gray-500 uppercase">Alumno</th>
                          <th className="p-4 text-xs font-bold text-gray-500 uppercase">Lección</th>
                          <th className="p-4 text-xs font-bold text-gray-500 uppercase">Nota</th>
                          <th className="p-4 text-xs font-bold text-gray-500 uppercase">Estado</th>
                          <th className="p-4 text-xs font-bold text-gray-500 uppercase">Fecha</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {dashboardData.map((row, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="p-4 font-bold text-gray-700">{row.student}</td>
                            <td className="p-4 text-gray-600 truncate max-w-xs">{row.topic}</td>
                            <td className="p-4">{row.score !== "-" ? <span className={`px-2 py-1 rounded-lg text-xs font-bold ${row.score >= row.total / 2 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{row.score} / {row.total}</span> : <span className="text-gray-400">-</span>}</td>
                            <td className="p-4">{row.status === 'completed' ? <span className="text-green-600 flex items-center gap-1 text-xs font-bold"><CheckCircle size={14} /> Completado</span> : <span className="text-orange-500 flex items-center gap-1 text-xs font-bold"><RotateCcw size={14} /> Pendiente</span>}</td>
                            <td className="p-4 text-xs text-gray-400">{new Date(row.date).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {view === 'lesson' && (
            <>
              {/* --- 1. TARJETA DE LA LECCIÓN (TEXTO Y BOTÓN EXAMEN) --- */}
              <div className="max-w-3xl mx-auto bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-[#E5E0D8]">
                <div className="flex flex-col md:flex-row justify-between items-start border-b border-gray-100 pb-6 mb-8 gap-4">
                  <div>
                    <span className="text-sm font-bold text-purple-600 uppercase tracking-wider">Lectura Generada</span>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mt-1">{currentTopic}</h2>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={handleSpeak}
                      className={`px-4 py-3 rounded-xl font-bold flex items-center gap-2 transition shadow-sm border ${isSpeaking
                        ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                        : "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
                        }`}
                    >
                      {isSpeaking ? <StopCircle size={20} /> : <Volume2 size={20} />}
                      {isSpeaking ? "Detener" : "Escuchar"}
                    </button>

                    {/* ESTE ES EL BOTÓN QUE TE FALTABA PARA IR AL TEST */}
                    <button onClick={() => { window.speechSynthesis.cancel(); setIsSpeaking(false); setView('quiz'); }} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition shadow-lg shadow-purple-200">
                      <span>Examen</span> <ArrowRight size={18} />
                    </button>
                  </div>
                </div>

                <div className="prose prose-lg prose-slate text-[#374151] leading-relaxed max-w-none font-serif">
                  <ReactMarkdown>{lessonContent}</ReactMarkdown>
                </div>
              </div>

              {/* --- 2. BOTÓN FLOTANTE TUTOR IA --- */}
              <button
                onClick={() => setShowTutor(!showTutor)}
                className="fixed bottom-8 right-8 bg-purple-600 text-white p-4 rounded-full shadow-2xl hover:bg-purple-700 transition-all hover:scale-110 z-50 flex items-center gap-2"
              >
                {showTutor ? <X size={24} /> : <MessageCircle size={28} />}
                {!showTutor && <span className="font-bold pr-2">¿Dudas?</span>}
              </button>

              {/* Ventana de Chat del Tutor */}
              {showTutor && (
                <div className="fixed bottom-24 right-8 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-purple-100 flex flex-col overflow-hidden z-50 animate-in slide-in-from-bottom-10" style={{ height: '450px' }}>
                  <div className="bg-purple-600 p-4 text-white flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-full"><GraduationCap size={20} /></div>
                    <div>
                      <h3 className="font-bold text-sm">Profesor IA</h3>
                      <p className="text-[10px] opacity-80">Pregúntame sobre esta lectura</p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 bg-gray-50 custom-scrollbar flex flex-col gap-3">
                    {tutorMessages.length === 0 && (
                      <div className="text-center text-gray-400 text-xs mt-10">
                        <p>👋 ¡Hola! Estoy leyendo la lección contigo.</p>
                        <p className="mt-2">Pregúntame cosas como:</p>
                        <p className="italic">"¿Qué significa la conclusión?"</p>
                      </div>
                    )}
                    {tutorMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.sender === 'user' ? 'bg-purple-600 text-white rounded-br-none' : 'bg-white border text-gray-700 rounded-bl-none shadow-sm'}`}>
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    {tutorLoading && <div className="text-xs text-gray-400 animate-pulse ml-2">Escribiendo...</div>}
                  </div>

                  <form onSubmit={handleAskTutor} className="p-3 bg-white border-t flex gap-2">
                    <input
                      className="flex-1 bg-gray-100 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 ring-purple-500"
                      placeholder="Escribe tu duda..."
                      value={tutorInput}
                      onChange={(e) => setTutorInput(e.target.value)}
                    />
                    <button type="submit" disabled={!tutorInput.trim() || tutorLoading} className="bg-purple-600 text-white p-2 rounded-xl hover:bg-purple-700 disabled:opacity-50">
                      <Send size={18} />
                    </button>
                  </form>
                </div>
              )}
            </>
          )}
          {view === 'quiz' && quizData.length > 0 && (
            <div className="max-w-2xl mx-auto mt-4 pb-20">
              <div className="mb-4 flex justify-between text-sm font-bold text-gray-500"><span>{currentQ + 1} / {quizData.length}</span><span>Puntos: {score}</span></div>
              <div className="w-full bg-gray-200 h-2 rounded-full mb-8"><div className="bg-purple-600 h-2 rounded-full" style={{ width: `${((currentQ + 1) / quizData.length) * 100}%` }} /></div>
              <div className="bg-white p-8 rounded-3xl border border-[#E5E0D8] shadow-sm">
                <h3 className="text-xl font-bold mb-8">{quizData[currentQ].question}</h3>
                <div className="space-y-4">
                  {quizData[currentQ].options.map((op, i) => {
                    let st = "border-[#E5E0D8] hover:bg-gray-50";
                    if (selectedOption === op) st = isCorrect ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50";
                    else if (isLocked && (op === quizData[currentQ].answer || op === quizData[currentQ].correctAnswer)) st = "border-green-500 bg-green-50 opacity-60";
                    return (<button key={i} disabled={isLocked} onClick={() => handleAnswer(op, quizData[currentQ].answer || quizData[currentQ].correctAnswer)} className={`w-full text-left p-4 rounded-xl border-2 transition-all ${st}`}>{op}</button>)
                  })}
                </div>
                {isLocked && (<div className="mt-6 animate-in fade-in"><div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl text-yellow-800 text-sm mb-4"><strong>Explicación:</strong> {quizData[currentQ].explanation}</div><button onClick={nextQuestion} className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2">Siguiente <ArrowRight /></button></div>)}
              </div>
            </div>
          )}
          {view === 'score' && (
            <div className="max-w-md mx-auto mt-10 text-center bg-white p-10 rounded-3xl shadow-lg border border-[#E5E0D8]">
              <CheckCircle className="mx-auto text-green-500 w-16 h-16 mb-4" /><h2 className="text-3xl font-bold mb-2">Resultados</h2>
              <div className="text-6xl font-black text-purple-600 my-6">{score} / {quizData.length}</div>
              <div className="bg-slate-50 p-6 rounded-2xl text-left mb-8 border border-slate-100"><p className="text-sm font-bold text-slate-500 uppercase mb-2">Feedback:</p><div className="prose prose-sm text-slate-700"><ReactMarkdown>{feedback}</ReactMarkdown></div></div>
              <button onClick={resetApp} className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold flex justify-center gap-2"><RotateCcw /> Inicio</button>
            </div>
          )}
        </main>

        {modals.paste && <ConfigModal title="Analizar Texto" onClose={() => setModals({ ...modals, paste: false })} onConfirm={() => handleAction('paste')} inputs={inputs} setInputs={setInputs} type="text" placeholder="Pega tu texto aquí..." isTeacher={isTeacherMode} />}
        {modals.topic && <ConfigModal title="Crear Lección" onClose={() => setModals({ ...modals, topic: false })} onConfirm={() => handleAction('topic')} inputs={inputs} setInputs={setInputs} type="topic" placeholder="Ej: Historia de Roma..." isTeacher={isTeacherMode} />}
        {modals.upload && <ConfigModal title="Configurar Archivo" onClose={() => setModals({ ...modals, upload: false })} onConfirm={() => handleAction('upload')} inputs={inputs} setInputs={setInputs} type="file" fileName={selectedFile?.name} isTeacher={isTeacherMode} />}

        {modals.teacherAuth && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in zoom-in-95">
            <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl">
              <div className="flex justify-center mb-4 text-purple-600"><Shield size={40} /></div>
              <h3 className="text-xl font-bold text-center mb-2">Acceso Docente</h3>
              <p className="text-center text-sm text-gray-500 mb-6">Ingresa el código institucional para verificar tu identidad.</p>
              <div className="flex items-center gap-2 border border-gray-300 p-3 rounded-xl bg-gray-50 focus-within:ring-2 ring-purple-500 mb-6">
                <Lock size={18} className="text-gray-400" />
                <input type="password" className="bg-transparent w-full outline-none" placeholder="Código Institucional" value={inputs.teacherCode} onChange={(e) => setInputs({ ...inputs, teacherCode: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setModals({ ...modals, teacherAuth: false })} className="w-1/2 py-2 text-gray-500 font-bold hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button onClick={handleTeacherPromotion} className="w-1/2 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700">Verificar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const OptionCard = ({ icon, title, onClick, color, children }) => (
  <div onClick={onClick} className="bg-white border border-[#E5E0D8] p-8 rounded-3xl cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1">
    <div className={`w-14 h-14 ${color} text-white rounded-2xl flex items-center justify-center mb-4 mx-auto shadow-md`}>{React.cloneElement(icon, { size: 28 })}</div><h3 className="font-bold text-lg">{title}</h3>{children}
  </div>
);

const ConfigModal = ({ title, onClose, onConfirm, inputs, setInputs, type, placeholder, fileName, isTeacher }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);

  const handleSearchUsers = async (text) => {
    const terms = text.split(','); const currentTerm = terms[terms.length - 1].trim();
    if (currentTerm.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/reading/users/search?q=${currentTerm}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      if (res.ok) { const users = await res.json(); setSuggestions(users); setShowSuggestions(users.length > 0); }
    } catch (e) { console.error(e); }
  };

  const handleAssignChange = (e) => {
    const val = e.target.value; setInputs({ ...inputs, assignTo: val });
    if (typingTimeout) clearTimeout(typingTimeout); setTypingTimeout(setTimeout(() => handleSearchUsers(val), 300));
  };

  const selectUser = (email) => {
    const terms = inputs.assignTo.split(','); terms.pop(); terms.push(email);
    setInputs({ ...inputs, assignTo: terms.join(', ') + ', ' }); setSuggestions([]); setShowSuggestions(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl" onClick={() => setShowSuggestions(false)}>
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">{type === 'file' ? <Upload size={20} /> : <FileText size={20} />}{title}</h3>
        {type === 'text' && <textarea className="w-full h-32 border p-3 rounded-xl bg-gray-50 mb-4" value={inputs.text} onChange={e => setInputs({ ...inputs, text: e.target.value })} placeholder={placeholder} />}
        {type === 'topic' && <input className="w-full border p-3 rounded-xl bg-gray-50 mb-4" value={inputs.topic} onChange={e => setInputs({ ...inputs, topic: e.target.value })} placeholder={placeholder} />}
        {type === 'file' && <div className="bg-blue-50 text-blue-800 p-3 rounded-xl mb-4 text-sm font-bold flex gap-2 items-center"><FileText size={16} /> {fileName}</div>}

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Nº Preguntas</label>
            <div className="flex items-center gap-2 border p-2 rounded-xl bg-gray-50"><FileQuestion size={18} className="text-gray-400" /><input type="number" min="1" max="10" className="bg-transparent w-full outline-none font-bold" value={inputs.numQ} onChange={e => setInputs({ ...inputs, numQ: e.target.value })} /></div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Dificultad</label>
            <div className="flex items-center gap-2 border p-2 rounded-xl bg-gray-50">
              <span className="text-sm">{inputs.difficulty === "Fácil" ? "🟢" : inputs.difficulty === "Medio" ? "🟡" : "🔴"}</span>
              <select className="bg-transparent w-full outline-none font-bold text-gray-700" value={inputs.difficulty} onChange={(e) => setInputs({ ...inputs, difficulty: e.target.value })}>
                <option value="Fácil">Fácil</option>
                <option value="Medio">Medio</option>
                <option value="Difícil">Difícil</option>
              </select>
            </div>
          </div>
        </div>

        {isTeacher && (
          <div className="relative mb-6">
            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Asignar (Buscar)</label>
            <div className="flex items-center gap-2 border p-2 rounded-xl bg-gray-50 focus-within:ring-2 ring-purple-500"><UserPlus size={18} className="text-gray-400" /><input type="text" placeholder="Buscar alumno..." className="bg-transparent w-full outline-none text-sm" value={inputs.assignTo} onChange={handleAssignChange} autoComplete="off" /></div>
            {showSuggestions && (
              <div className="absolute top-full left-0 w-full bg-white border rounded-xl shadow-xl mt-1 z-50 overflow-hidden max-h-40 overflow-y-auto">
                {suggestions.map((u, i) => (<div key={i} onClick={(e) => { e.stopPropagation(); selectUser(u.email); }} className="p-3 hover:bg-purple-50 cursor-pointer border-b last:border-0"><span className="font-bold text-sm block">{u.name}</span><span className="text-xs text-gray-500">{u.email}</span></div>))}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-100 rounded-lg">Cancelar</button>
          <button onClick={onConfirm} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md">
            {inputs.assignTo && isTeacher ? "Asignar Tarea" : "Generar"}
          </button>
        </div>
      </div>
    </div>
  );
};