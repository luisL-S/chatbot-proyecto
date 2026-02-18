import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable';
import ReactMarkdown from 'react-markdown';
import {
  Upload, FileText, BookOpen, Menu, X,
  GraduationCap, LogOut, CheckCircle, RotateCcw,
  AlertCircle, ArrowRight, UserPlus, FileQuestion,
  LayoutDashboard, User, Users, Shield, Trash2, Volume2,
  StopCircle, Download, MessageCircle, Send, AlertTriangle, Filter,
  ArrowLeft, Loader2
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// --- COMPONENTE DE TOOLTIP PERSONALIZADO ---
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border border-slate-200 shadow-xl rounded-xl z-50">
        <p className="font-bold text-slate-800 text-sm mb-1">{data.studentShort}</p>
        <p className="text-xs text-slate-500 font-medium mb-2">{data.topic}</p>
        <div className="flex items-center gap-2 border-t border-slate-100 pt-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded ${data.scoreNum >= 3 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
            Nota: {data.scoreNum} / {data.total}
          </span>
          <span className="text-[10px] text-gray-400">{new Date(data.date).toLocaleDateString()}</span>
        </div>
      </div>
    );
  }
  return null;
};

// =========================================
// COMPONENTE PRINCIPAL: CHATPAGE
// =========================================
export default function ChatPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // --- ESTADOS ---
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [dashboardData, setDashboardData] = useState([]);
  const [mobileMenu, setMobileMenu] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);

  // --- ESTADO PARA MODAL DE BORRAR (HISTORIAL) ---
  const [deleteTarget, setDeleteTarget] = useState(null);

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
  const [tutorMessages, setTutorMessages] = useState([]);
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
  const [modals, setModals] = useState({ paste: false, topic: false, upload: false });
  const [inputs, setInputs] = useState({ text: "", topic: "", numQ: 5, assignTo: "", difficulty: "Medio" });
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
      const res = await fetch('https://backend-proyect-j2u2.onrender.com/api/reading/user/role', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (res.ok) {
        const data = await res.json();
        const hasPerms = data.role === 'teacher' || data.role === 'admin';
        setCanTeach(hasPerms);
        if (hasPerms) setIsTeacherMode(true);
        if (data.role === 'admin') setIsAdmin(true);
      }
    } catch (e) { console.error("Error verificando rol"); }
  };

  const loadHistoryList = async () => {
    try {
      const res = await fetch('https://backend-proyect-j2u2.onrender.com/api/reading/history', { headers: { 'Authorization': `Bearer ${getToken()}` } });
      if (res.ok) setHistory(await res.json());
    } catch (e) { console.error(e); }
  };

  const loadTeacherDashboard = async () => {
    setLoading(true);
    setMobileMenu(false);
    try {
      const res = await fetch('https://backend-proyect-j2u2.onrender.com/api/reading/teacher/dashboard', { headers: { 'Authorization': `Bearer ${getToken()}` } });
      if (res.ok) {
        const data = await res.json();
        const processedData = data.map(d => ({
          ...d,
          scoreNum: d.score === '-' ? 0 : Number(d.score),
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
      const res = await fetch(`https://backend-proyect-j2u2.onrender.com/api/reading/history/${id}`, { headers: { 'Authorization': `Bearer ${getToken()}` } });
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

  const requestDelete = (e, id) => {
    e.stopPropagation();
    setDeleteTarget(id);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await fetch(`https://backend-proyect-j2u2.onrender.com/api/reading/history/${deleteTarget}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } });
      loadHistoryList();
      setDeleteTarget(null);
    } catch (e) { setErrorMsg("Error al borrar"); }
  };

  const handleAction = async (type) => {
    setLoading(true); setErrorMsg(""); setSuccessMsg("");
    setModals({ paste: false, topic: false, upload: false });
    try {
      const token = getToken();
      let url = "";
      let body;
      let headers = { 'Authorization': `Bearer ${token}` };
      const targetEmail = isTeacherMode ? inputs.assignTo : null;
      const payload = {
        ...inputs,
        num_questions: parseInt(inputs.numQ),
        assign_to: targetEmail
      };

      if (type === 'paste') {
        url = 'https://backend-proyect-j2u2.onrender.com/api/reading/analyze-text';
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify({
          text: inputs.text,
          num_questions: payload.num_questions,
          difficulty: inputs.difficulty,
          assign_to: payload.assign_to
        });
      }
      else if (type === 'topic') {
        url = 'https://backend-proyect-j2u2.onrender.com/api/reading/create-lesson';
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify({
          topic: inputs.topic,
          num_questions: payload.num_questions,
          difficulty: inputs.difficulty,
          assign_to: payload.assign_to
        });
      }
      else if (type === 'upload') {
        url = 'https://backend-proyect-j2u2.onrender.com/api/reading/upload';
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("num_questions", payload.num_questions);
        formData.append("difficulty", inputs.difficulty);
        if (payload.assign_to) formData.append("assign_to", payload.assign_to);
        body = formData;
      }

      const res = await fetch(url, { method: 'POST', headers: type === 'upload' ? { 'Authorization': `Bearer ${token}` } : headers, body });
      if (!res.ok) throw new Error("Error servidor");
      const data = await res.json();

      if (payload.assign_to && payload.assign_to.trim() !== "") {
        setSuccessMsg(data.message || `¡Tarea enviada a ${payload.assign_to}!`);
      } else {
        setCurrentLessonId(data.lesson_id);
        setQuizData(data.quiz.questions || data.quiz);
        setLessonContent(data.text || data.content || "");
        setCurrentTopic(data.filename || inputs.topic || "Nuevo Tema");
        setView(data.text || data.content ? 'lesson' : 'quiz');
      }
      loadHistoryList();
      setInputs({ ...inputs, text: "", topic: "", assignTo: "" });
      setSelectedFile(null);
    } catch (e) { setErrorMsg("Ocurrió un error."); }
    finally { setLoading(false); }
  };

  const handleAnswer = (option, correct) => { if (isLocked) return; setIsLocked(true); const hit = option === correct; setSelectedOption(option); setIsCorrect(hit); };
  const nextQuestion = () => { if (isCorrect) setScore(s => s + 1); const next = currentQ + 1; if (next < quizData.length) { setCurrentQ(next); resetQuestionState(); } else { finishQuiz(isCorrect ? score + 1 : score); } };
  const resetQuestionState = () => { setSelectedOption(null); setIsCorrect(null); setIsLocked(false); };

  const finishQuiz = async (finalScore) => {
    setView('score'); setFeedback("Guardando...");
    try {
      const res = await fetch('https://backend-proyect-j2u2.onrender.com/api/reading/feedback-analysis', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ score: finalScore, total: quizData.length, topic: currentTopic, lesson_id: currentLessonId })
      });
      if (res.ok) { const data = await res.json(); setFeedback(data.feedback); }
      loadHistoryList();
    } catch (e) { setFeedback("Error guardando nota."); }
  };

  const resetApp = () => { setView('menu'); setScore(0); setCurrentQ(0); setLessonContent(""); setQuizData([]); resetQuestionState(); loadHistoryList(); setMobileMenu(false); };

  const handleSpeak = () => {
    if (!lessonContent) return;
    if (isSpeaking) { window.speechSynthesis.cancel(); setIsSpeaking(false); return; }
    const cleanText = lessonContent.replace(/[_*-]{3,}/g, "").replace(/[#*`]/g, "").replace(/\[(.*?)\]\(.*?\)/g, "$1").trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "es-ES";
    utterance.rate = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

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
    autoTable(doc, { head: [tableColumn], body: tableRows, startY: 30 });
    doc.save("Reporte_EduBot.pdf");
  };

  const handleAskTutor = async (e) => {
    e.preventDefault();
    if (!tutorInput.trim()) return;
    const userQ = tutorInput;
    setTutorMessages(prev => [...prev, { sender: 'user', text: userQ }]);
    setTutorInput("");
    setTutorLoading(true);
    try {
      const res = await fetch('https://backend-proyect-j2u2.onrender.com/api/reading/ask-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ question: userQ, context: lessonContent })
      });
      if (res.ok) {
        const data = await res.json();
        setTutorMessages(prev => [...prev, { sender: 'bot', text: data.answer }]);
      } else {
        setTutorMessages(prev => [...prev, { sender: 'bot', text: "El profesor está descansando (Error)." }]);
      }
    } catch (err) {
      setTutorMessages(prev => [...prev, { sender: 'bot', text: "Error de conexión." }]);
    } finally {
      setTutorLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">
      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out bg-slate-900 border-r border-slate-800 text-slate-300 shadow-2xl flex flex-col ${mobileMenu ? "translate-x-0" : "-translate-x-full"} md:relative md:translate-x-0`}>
        <div onClick={resetApp} className="p-6 border-b border-slate-800 flex items-center gap-3 cursor-pointer hover:bg-slate-800 transition">
          <div className="bg-indigo-600 p-1.5 rounded-lg text-white"><GraduationCap size={20} /></div>
          <span className="font-bold text-xl text-white tracking-tight">EduBot</span>
          <button onClick={() => setMobileMenu(false)} className="md:hidden ml-auto"><X /></button>
        </div>

        {canTeach && (
          <div className="px-4 mt-6 animate-in fade-in space-y-3 shrink-0">
            <div className="p-3 rounded-xl border bg-indigo-600 border-indigo-500 text-white shadow-lg flex items-center gap-3">
              <Users size={20} />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase opacity-80">Modo Actual</span>
                <span className="font-bold text-sm">Docente</span>
              </div>
            </div>
            {isTeacherMode && (
              <button onClick={loadTeacherDashboard} className="w-full flex items-center gap-3 p-3 bg-slate-800 text-slate-300 rounded-xl text-sm font-bold hover:bg-slate-700 hover:text-white transition">
                <LayoutDashboard size={18} /> Dashboard
              </button>
            )}
            {isAdmin && (
              <button onClick={() => { setView('adminPanel'); setMobileMenu(false); }} className="w-full flex items-center gap-3 p-3 bg-slate-800 text-slate-300 rounded-xl text-sm font-bold hover:bg-slate-700 hover:text-white transition">
                <Shield size={18} /> Usuarios
              </button>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar mt-2">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-3 px-2 tracking-wider">Historial</h3>
          {history.map(h => (
            <div key={h.id} onClick={() => loadHistoryItem(h.id)} className="group flex justify-between p-3 mb-2 text-sm bg-slate-800/50 rounded-xl border border-transparent hover:border-indigo-500 hover:bg-slate-800 cursor-pointer relative transition">
              <div className="flex flex-col w-40 overflow-hidden">
                <span className="truncate font-medium text-slate-300 group-hover:text-white">{h.topic}</span>
                {h.is_assignment && <span className="text-[10px] text-sky-400 font-bold mt-1 flex items-center gap-1">Tarea</span>}
                {h.score !== undefined && h.score !== null && <span className="text-[10px] text-emerald-400 font-bold">Nota: {h.score}</span>}
              </div>
              <button onClick={(e) => requestDelete(e, h.id)} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-800 shrink-0">
          <button onClick={() => { localStorage.removeItem("token"); navigate("/login"); }} className="flex items-center gap-3 text-slate-400 w-full p-3 hover:bg-slate-800 hover:text-white rounded-xl font-medium transition">
            <LogOut size={18} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-slate-50">
        <header className="md:hidden p-4 bg-white border-b border-slate-200 flex justify-between items-center z-20"><button onClick={() => setMobileMenu(true)}><Menu className="text-slate-600" /></button><span className="font-bold text-indigo-700 text-lg">EduBot</span><div className="w-6" /></header>

        <main className="flex-1 overflow-y-auto p-6 md:p-12 relative scroll-smooth">
          {errorMsg && <div className="fixed top-6 right-6 bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl z-50 animate-in slide-in-from-top-5 flex gap-2 shadow-lg font-medium"><AlertCircle /> {errorMsg}</div>}
          {successMsg && <div className="fixed top-6 right-6 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl z-50 animate-in slide-in-from-top-5 flex gap-2 shadow-lg font-medium"><CheckCircle /> {successMsg}</div>}

          {loading && (
            <div className="absolute inset-0 bg-white/80 z-40 flex flex-col items-center justify-center backdrop-blur-sm">
              <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="mt-4 font-bold text-indigo-900">Procesando...</p>
            </div>
          )}

          {view === 'menu' && !loading && (
            <div className="max-w-4xl mx-auto flex flex-col justify-center h-full text-center">
              <div className="mb-10 animate-in zoom-in-95 duration-500">
                <div className="inline-block p-3 rounded-2xl bg-indigo-50 text-indigo-600 mb-4 shadow-sm"><GraduationCap size={48} /></div>
                <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-3 tracking-tight">Bienvenido a <span className="text-indigo-600">EduBot</span></h1>
                <p className="text-slate-500 text-lg max-w-lg mx-auto">Tu asistente educativo inteligente.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <OptionCard icon={<Upload />} title="Subir Archivo" onClick={() => fileInputRef.current.click()} iconColor="text-indigo-600" bgColor="bg-indigo-50">
                  <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => { if (e.target.files[0]) { setSelectedFile(e.target.files[0]); setModals({ ...modals, upload: true }); } }} accept=".pdf,.docx,.png,.jpg,.jpeg" />
                </OptionCard>
                {isTeacherMode && (
                  <>
                    <OptionCard icon={<FileText />} title="Pegar Texto" onClick={() => setModals({ ...modals, paste: true })} iconColor="text-sky-600" bgColor="bg-sky-50" />
                    <OptionCard icon={<BookOpen />} title="Crear Lección" onClick={() => setModals({ ...modals, topic: true })} iconColor="text-violet-600" bgColor="bg-violet-50" />
                  </>
                )}
              </div>
            </div>
          )}

          {view === 'adminPanel' && isAdmin && (
            <AdminPanel token={getToken()} resetApp={resetApp} />
          )}

          {view === 'dashboard' && (
            <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 pb-20">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-3"><LayoutDashboard className="text-indigo-600" /> Panel Docente</h2>
                  <p className="text-slate-500 mt-1">Monitorea el progreso de tus estudiantes.</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={downloadPDF} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-100 transition"><Download size={18} /> <span className="hidden md:inline">PDF</span></button>
                  <button onClick={resetApp} className="bg-white border border-slate-200 hover:border-slate-300 text-slate-600 px-5 py-2.5 rounded-xl font-bold transition">Volver</button>
                </div>
              </div>

              {dashboardData.length > 0 && (
                <div className="bg-white p-4 md:p-8 rounded-3xl border border-slate-200 shadow-sm mb-8 h-72 md:h-96 w-full">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Rendimiento General</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboardData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="id" tickFormatter={(val) => { const item = dashboardData.find(d => d.id === val); return item ? item.studentShort : val; }} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} dy={10} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', opacity: 1 }} />
                      <Bar dataKey="scoreNum" name="Nota" radius={[4, 4, 0, 0]} barSize={50}>
                        {dashboardData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.scoreNum >= entry.total / 2 ? '#4f46e5' : '#f43f5e'} />))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="bg-white md:rounded-3xl md:shadow-sm md:border border-slate-200 overflow-hidden bg-transparent md:bg-white">
                {dashboardData.length === 0 ? (
                  <div className="p-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">No hay datos registrados aún.</div>
                ) : (
                  <>
                    <table className="hidden md:table w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="p-5 text-xs font-bold text-slate-500 uppercase">Alumno</th>
                          <th className="p-5 text-xs font-bold text-slate-500 uppercase">Lección</th>
                          <th className="p-5 text-xs font-bold text-slate-500 uppercase">Nota</th>
                          <th className="p-5 text-xs font-bold text-slate-500 uppercase">Estado</th>
                          <th className="p-5 text-xs font-bold text-slate-500 uppercase">Fecha</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {dashboardData.map((row, i) => (
                          <tr key={i} className="hover:bg-slate-50/50 transition">
                            <td className="p-5 font-bold text-slate-700">{row.student}</td>
                            <td className="p-5 text-slate-600 truncate max-w-xs">{row.topic}</td>
                            <td className="p-5">{row.score !== "-" ? <span className={`px-3 py-1 rounded-full text-xs font-bold ${row.score >= row.total / 2 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{row.score} / {row.total}</span> : <span className="text-slate-300 font-bold">-</span>}</td>
                            <td className="p-5">{row.status === 'completed' ? <span className="text-emerald-600 flex items-center gap-1.5 text-xs font-bold"><CheckCircle size={16} /> Completado</span> : <span className="text-amber-500 flex items-center gap-1.5 text-xs font-bold"><RotateCcw size={16} /> Pendiente</span>}</td>
                            <td className="p-5 text-xs text-slate-400 font-medium">{new Date(row.date).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="md:hidden space-y-3">
                      {dashboardData.map((row, i) => (
                        <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-bold text-slate-800">{row.student}</span>
                            <span className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">{new Date(row.date).toLocaleDateString()}</span>
                          </div>
                          <div className="text-sm text-slate-600 font-medium mb-4 line-clamp-2">{row.topic}</div>
                          <div className="flex justify-between items-center border-t border-slate-50 pt-3">
                            {row.score !== "-" ?
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${row.score >= row.total / 2 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>Nota: {row.score} / {row.total}</span>
                              : <span className="text-slate-400 text-xs font-bold">Sin Nota</span>
                            }
                            {row.status === 'completed' ? <span className="text-emerald-600 flex items-center gap-1 text-xs font-bold"><CheckCircle size={14} /> Listo</span> : <span className="text-amber-500 flex items-center gap-1 text-xs font-bold"><RotateCcw size={14} /> Pendiente</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {view === 'lesson' && (
            <>
              <div className="max-w-4xl mx-auto bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-bottom-5">
                <div className="flex flex-col md:flex-row justify-between items-start border-b border-slate-100 pb-8 mb-8 gap-6">
                  <div>
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">Lectura Generada</span>
                    <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mt-3">{currentTopic}</h2>
                  </div>
                  <div className="flex gap-3 shrink-0">
                    <button onClick={handleSpeak} className={`px-5 py-3 rounded-xl font-bold flex items-center gap-2 transition border ${isSpeaking ? "bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}>
                      {isSpeaking ? <StopCircle size={20} /> : <Volume2 size={20} />}
                      <span className="hidden md:inline">{isSpeaking ? "Detener" : "Escuchar"}</span>
                    </button>
                    <button onClick={() => { window.speechSynthesis.cancel(); setIsSpeaking(false); setView('quiz'); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition shadow-lg shadow-indigo-200">
                      <span className="hidden md:inline">Ir al Examen</span> <ArrowRight size={20} />
                    </button>
                  </div>
                </div>
                <div className="prose prose-lg prose-slate text-slate-600 leading-8 max-w-none">
                  <ReactMarkdown>{lessonContent}</ReactMarkdown>
                </div>
              </div>

              <button onClick={() => setShowTutor(!showTutor)} className="fixed bottom-8 right-8 bg-indigo-600 text-white p-4 rounded-full shadow-2xl hover:bg-indigo-700 transition-all hover:scale-105 z-50 flex items-center gap-2">
                {showTutor ? <X size={24} /> : <MessageCircle size={28} />}
              </button>

              {showTutor && (
                <div className="fixed bottom-24 right-8 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden z-50 animate-in slide-in-from-bottom-10" style={{ height: '500px' }}>
                  <div className="bg-indigo-600 p-4 text-white flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-full"><GraduationCap size={20} /></div>
                    <div><h3 className="font-bold">Profesor IA</h3><p className="text-xs opacity-80">Asistente Virtual</p></div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 bg-slate-50 custom-scrollbar flex flex-col gap-3">
                    {tutorMessages.length === 0 && (<div className="text-center text-slate-400 text-sm mt-12"><p>👋 Hola, estoy aquí para ayudarte.</p></div>)}
                    {tutorMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.sender === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'}`}>
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    {tutorLoading && <div className="text-xs text-slate-400 animate-pulse ml-4">Escribiendo...</div>}
                  </div>
                  <form onSubmit={handleAskTutor} className="p-3 bg-white border-t border-slate-100 flex gap-2">
                    <input className="flex-1 bg-slate-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 ring-indigo-500 transition" placeholder="Escribe tu duda..." value={tutorInput} onChange={(e) => setTutorInput(e.target.value)} />
                    <button type="submit" disabled={!tutorInput.trim() || tutorLoading} className="bg-indigo-600 text-white p-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition"><Send size={18} /></button>
                  </form>
                </div>
              )}
            </>
          )}

          {view === 'quiz' && quizData.length > 0 && (
            <div className="max-w-3xl mx-auto mt-8 pb-20 animate-in fade-in slide-in-from-bottom-5">
              <div className="mb-6 flex justify-between text-sm font-bold text-slate-400 uppercase tracking-widest"><span>Pregunta {currentQ + 1} de {quizData.length}</span><span>Puntos: {score}</span></div>
              <div className="w-full bg-slate-200 h-2.5 rounded-full mb-8 overflow-hidden"><div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${((currentQ + 1) / quizData.length) * 100}%` }} /></div>

              <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-lg">
                <h3 className="text-2xl font-bold mb-8 text-slate-800 leading-snug">{quizData[currentQ].question}</h3>
                <div className="space-y-4">
                  {quizData[currentQ].options.map((op, i) => {
                    let st = "border-slate-200 hover:border-indigo-300 hover:bg-slate-50 text-slate-600";
                    if (selectedOption === op) st = isCorrect ? "border-emerald-500 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500" : "border-rose-500 bg-rose-50 text-rose-800 ring-1 ring-rose-500";
                    else if (isLocked && (op === quizData[currentQ].answer || op === quizData[currentQ].correctAnswer)) st = "border-emerald-500 bg-emerald-50 text-emerald-800 opacity-50";
                    return (<button key={i} disabled={isLocked} onClick={() => handleAnswer(op, quizData[currentQ].answer || quizData[currentQ].correctAnswer)} className={`w-full text-left p-5 rounded-2xl border-2 transition-all font-medium text-lg ${st}`}>{op}</button>)
                  })}
                </div>
                {isLocked && (
                  <div className="mt-8 animate-in fade-in slide-in-from-top-2">
                    <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-2xl text-indigo-900 text-sm mb-6 flex gap-3">
                      <div className="mt-0.5"><AlertCircle size={18} /></div>
                      <div><strong className="block mb-1">Explicación:</strong> {quizData[currentQ].explanation}</div>
                    </div>
                    <button onClick={nextQuestion} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-lg hover:bg-black transition flex justify-center items-center gap-3">Siguiente Pregunta <ArrowRight /></button>
                  </div>
                )}
              </div>
            </div>
          )}

          {view === 'score' && (
            <div className="max-w-lg mx-auto mt-16 text-center bg-white p-12 rounded-3xl shadow-xl border border-slate-200 animate-in zoom-in-95">
              <div className="bg-emerald-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600"><CheckCircle size={40} /></div>
              <h2 className="text-3xl font-extrabold text-slate-800 mb-2">¡Lección Completada!</h2>
              <p className="text-slate-500 mb-8">Aquí tienes el resumen de tu desempeño.</p>
              <div className="text-7xl font-black text-indigo-600 mb-2">{score} <span className="text-3xl text-slate-300 font-bold">/ {quizData.length}</span></div>
              <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-8">Puntuación Final</div>
              <div className="bg-slate-50 p-6 rounded-2xl text-left mb-8 border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase mb-3">Feedback de la IA:</p>
                <div className="prose prose-sm text-slate-600"><ReactMarkdown>{feedback}</ReactMarkdown></div>
              </div>
              <button onClick={resetApp} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold flex justify-center gap-2 hover:bg-black transition">
                <RotateCcw /> Volver al Inicio
              </button>
            </div>
          )}
        </main>

        {/* --- MODALES --- */}
        {modals.paste && <ConfigModal title="Analizar Texto" onClose={() => setModals({ ...modals, paste: false })} onConfirm={() => handleAction('paste')} inputs={inputs} setInputs={setInputs} type="text" placeholder="Pega tu texto aquí..." isTeacher={isTeacherMode} />}
        {modals.topic && <ConfigModal title="Crear Lección" onClose={() => setModals({ ...modals, topic: false })} onConfirm={() => handleAction('topic')} inputs={inputs} setInputs={setInputs} type="topic" placeholder="Ej: Revolución Industrial..." isTeacher={isTeacherMode} />}
        {modals.upload && <ConfigModal title="Subir Archivo" onClose={() => setModals({ ...modals, upload: false })} onConfirm={() => handleAction('upload')} inputs={inputs} setInputs={setInputs} type="file" fileName={selectedFile?.name} isTeacher={isTeacherMode} />}

        {/* --- MODAL CONFIRMAR BORRADO --- */}
        {deleteTarget && (
          <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl relative text-center">
              <div className="flex justify-center mb-4 text-rose-500"><AlertTriangle size={48} /></div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">¿Eliminar esta lección?</h3>
              <p className="text-sm text-slate-500 mb-6">Esta acción no se puede deshacer.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition">Cancelar</button>
                <button onClick={confirmDelete} className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition shadow-lg shadow-rose-100">Eliminar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- COMPONENTES AUXILIARES ---

const OptionCard = ({ icon, title, onClick, iconColor, bgColor, children }) => (
  <div onClick={onClick} className="bg-white border border-slate-200 p-8 rounded-3xl cursor-pointer hover:shadow-xl hover:border-indigo-300 transition-all hover:-translate-y-1 group">
    <div className={`w-16 h-16 ${bgColor} ${iconColor} rounded-2xl flex items-center justify-center mb-6 mx-auto transition-transform group-hover:scale-110`}>
      {React.cloneElement(icon, { size: 32 })}
    </div>
    <h3 className="font-bold text-lg text-slate-800 group-hover:text-indigo-600 transition-colors">{title}</h3>
    {children}
  </div>
);

// Panel de Administración
const AdminPanel = ({ token, resetApp: onBack }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      const res = await fetch('https://backend-proyect-j2u2.onrender.com/api/auth/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setUsers(await res.json());
    } catch (e) { console.error("Error cargando usuarios"); }
    setLoading(false);
  };

  const handleRoleChange = async (email, newRole) => {
    setLoading(true);
    try {
      const res = await fetch('https://backend-proyect-j2u2.onrender.com/api/auth/admin/change-role', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ email, new_role: newRole })
      });
      if (res.ok) { alert(`Rol actualizado a ${newRole}`); loadUsers(); }
    } catch (e) { alert("Error de conexión"); }
    setLoading(false);
  };

  const promptDelete = (email) => { setUserToDelete(email); setShowDeleteModal(true); };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`https://backend-proyect-j2u2.onrender.com/api/auth/admin/delete-user?email=${userToDelete}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setShowDeleteModal(false); setUserToDelete(null);
        alert("🗑️ Usuario eliminado correctamente."); loadUsers();
      } else {
        const data = await res.json();
        alert("Error: " + (data.detail || "No se pudo borrar"));
      }
    } catch (e) { alert("Error de conexión"); }
    setIsDeleting(false);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition"><ArrowLeft size={24} className="text-slate-600" /></button>
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3"><Shield size={32} className="text-indigo-600" /> Panel de Administración</h1>
          <p className="text-slate-500 mt-1">Gestión de usuarios y roles de la plataforma.</p>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h2 className="font-bold text-lg text-slate-700 flex items-center gap-2"><Users size={20} /> Usuarios Registrados</h2>
          <button className="flex items-center gap-2 text-sm font-bold text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-lg transition"><Download size={16} /> Exportar Excel</button>
        </div>
        <div className="p-0">
          {loading ? (
            <div className="p-10 text-center text-slate-400 flex flex-col items-center gap-3"><Loader2 size={32} className="animate-spin text-indigo-500" /> Cargando usuarios...</div>
          ) : (
            <>
              {/* ========================================= */}
              {/* 🖥️ VISTA DE ESCRITORIO (TABLA TRADICIONAL) */}
              {/* Se oculta en móviles con 'hidden md:block' */}
              {/* ========================================= */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider text-left">
                    <tr><th className="p-4">Usuario</th><th className="p-4">Rol Actual</th><th className="p-4 text-center">Acciones</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">
                              {(u.username && u.username.length > 0) ? u.username.charAt(0).toUpperCase() : "?"}
                            </div>
                            <div>
                              <div className="font-bold text-slate-800">{u.username || "Sin Nombre"}</div>
                              <div className="text-sm text-slate-500">{u.email}</div>
                              {u.role === 'student' && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full mt-1 inline-block">{u.grade} - {u.section}</span>}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase inline-flex items-center gap-1 ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : u.role === 'teacher' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {u.role === 'admin' ? <Shield size={12} /> : u.role === 'teacher' ? <GraduationCap size={12} /> : <User size={12} />}
                            {u.role === 'teacher' ? 'Docente' : u.role === 'student' ? 'Estudiante' : 'Admin'}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleRoleChange(u.email, 'student')} title="Estudiante" className={`p-2 rounded-lg border transition ${u.role === 'student' ? 'bg-emerald-50 border-emerald-200 text-emerald-600 opacity-50' : 'hover:bg-emerald-50 text-emerald-600'}`} disabled={u.role === 'student'}><User size={18} /></button>
                            <button onClick={() => handleRoleChange(u.email, 'teacher')} title="Docente" className={`p-2 rounded-lg border transition ${u.role === 'teacher' ? 'bg-indigo-50 border-indigo-200 text-indigo-600 opacity-50' : 'hover:bg-indigo-50 text-indigo-600'}`} disabled={u.role === 'teacher'}><GraduationCap size={18} /></button>
                            <button onClick={() => handleRoleChange(u.email, 'admin')} title="Admin" className={`p-2 rounded-lg border transition ${u.role === 'admin' ? 'bg-purple-50 border-purple-200 text-purple-600 opacity-50' : 'hover:bg-purple-50 text-purple-600'}`} disabled={u.role === 'admin'}><Shield size={18} /></button>
                            <button onClick={() => promptDelete(u.email)} className="p-2 ml-2 rounded-lg border border-rose-200 text-rose-500 hover:bg-rose-50 transition" title="Eliminar"><Trash2 size={18} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ========================================= */}
              {/* 📱 VISTA MÓVIL (TARJETAS INDIVIDUALES)   */}
              {/* Se muestra SOLO en móviles con 'md:hidden' */}
              {/* ========================================= */}
              <div className="md:hidden p-4 space-y-4 bg-slate-50">
                {users.map(u => (
                  <div key={u.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    {/* Cabecera de la Tarjeta */}
                    <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3">
                      <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-lg shrink-0">
                        {(u.username && u.username.length > 0) ? u.username.charAt(0).toUpperCase() : "?"}
                      </div>
                      <div className="overflow-hidden">
                        <div className="font-bold text-slate-800 text-lg truncate">{u.username || "Sin Nombre"}</div>
                        <div className="text-xs text-slate-500 truncate">{u.email}</div>
                      </div>
                    </div>

                    {/* Información y Rol */}
                    <div className="flex justify-between items-center mb-5">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase inline-flex items-center gap-1.5 ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : u.role === 'teacher' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {u.role === 'admin' ? <Shield size={12} /> : u.role === 'teacher' ? <GraduationCap size={12} /> : <User size={12} />}
                        {u.role === 'teacher' ? 'Docente' : u.role === 'student' ? 'Estudiante' : 'Admin'}
                      </span>
                      {u.role === 'student' && <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded">{u.grade} • {u.section}</span>}
                    </div>

                    {/* Botones de Acción (Grandes para el dedo) */}
                    <div className="grid grid-cols-4 gap-3">
                      <button onClick={() => handleRoleChange(u.email, 'student')} disabled={u.role === 'student'} className={`flex flex-col items-center justify-center p-2 rounded-xl border transition ${u.role === 'student' ? 'bg-slate-100 text-slate-300' : 'border-slate-200 text-emerald-600 hover:bg-emerald-50'}`}>
                        <User size={20} /> <span className="text-[9px] font-bold mt-1">Est.</span>
                      </button>
                      <button onClick={() => handleRoleChange(u.email, 'teacher')} disabled={u.role === 'teacher'} className={`flex flex-col items-center justify-center p-2 rounded-xl border transition ${u.role === 'teacher' ? 'bg-slate-100 text-slate-300' : 'border-slate-200 text-indigo-600 hover:bg-indigo-50'}`}>
                        <GraduationCap size={20} /> <span className="text-[9px] font-bold mt-1">Prof.</span>
                      </button>
                      <button onClick={() => handleRoleChange(u.email, 'admin')} disabled={u.role === 'admin'} className={`flex flex-col items-center justify-center p-2 rounded-xl border transition ${u.role === 'admin' ? 'bg-slate-100 text-slate-300' : 'border-slate-200 text-purple-600 hover:bg-purple-50'}`}>
                        <Shield size={20} /> <span className="text-[9px] font-bold mt-1">Adm.</span>
                      </button>
                      <button onClick={() => promptDelete(u.email)} className="flex flex-col items-center justify-center p-2 rounded-xl border border-rose-200 text-rose-500 hover:bg-rose-50">
                        <Trash2 size={20} /> <span className="text-[9px] font-bold mt-1">Borrar</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-rose-50 p-6 flex items-center gap-4 border-b border-rose-100">
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center shrink-0"><AlertTriangle size={24} /></div>
              <div><h3 className="text-xl font-bold text-rose-700">¿Eliminar usuario?</h3><p className="text-rose-600/80 text-sm">Esta acción es irreversible.</p></div>
            </div>
            <div className="p-6 text-slate-600">
              <p>Estás a punto de eliminar permanentemente la cuenta de:</p>
              <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 font-mono text-sm text-center font-bold text-slate-800 break-all">{userToDelete}</div>
              <p className="mt-4 text-sm text-slate-500">Se perderá todo su historial, notas y chats generados.</p>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3 justify-end">
              <button onClick={() => { setShowDeleteModal(false); setUserToDelete(null); }} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 transition" disabled={isDeleting}>Cancelar</button>
              <button onClick={confirmDelete} disabled={isDeleting} className="px-5 py-2.5 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 transition shadow-lg shadow-rose-200 flex items-center gap-2 disabled:opacity-70">
                {isDeleting ? (<> <Loader2 size={18} className="animate-spin" /> Borrando... </>) : (<> <Trash2 size={18} /> Sí, eliminar </>)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ConfigModal = ({ title, onClose, onConfirm, inputs, setInputs, type, placeholder, fileName, isTeacher }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [filterGrade, setFilterGrade] = useState("Todos");
  const [filterSection, setFilterSection] = useState("Todos");

  const handleSearchUsers = async (text) => {
    const terms = text.split(','); const currentTerm = terms[terms.length - 1].trim();
    if (currentTerm.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    try {
      const res = await fetch(`https://backend-proyect-j2u2.onrender.com/api/reading/users/search?q=${currentTerm}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      if (res.ok) {
        const users = await res.json();
        const filtered = users.filter(u => {
          const matchGrade = filterGrade === "Todos" || u.grade === filterGrade;
          const matchSection = filterSection === "Todos" || u.section === filterSection;
          return matchGrade && matchSection;
        });
        setSuggestions(filtered); setShowSuggestions(filtered.length > 0);
      }
    } catch (e) { }
  };

  const handleAssignChange = (e) => {
    const val = e.target.value; setInputs({ ...inputs, assignTo: val });
    if (typingTimeout) clearTimeout(typingTimeout);
    setTypingTimeout(setTimeout(() => handleSearchUsers(val), 300));
  };

  const selectUser = (email) => {
    const terms = inputs.assignTo.split(','); terms.pop(); terms.push(email);
    setInputs({ ...inputs, assignTo: terms.join(', ') + ', ' });
    setSuggestions([]); setShowSuggestions(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl" onClick={() => setShowSuggestions(false)}>
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-800">{type === 'file' ? <Upload size={24} className="text-indigo-600" /> : <FileText size={24} className="text-indigo-600" />}{title}</h3>

        {type === 'text' && <textarea className="w-full h-32 border border-slate-200 p-4 rounded-xl bg-slate-50 mb-5 focus:ring-2 ring-indigo-500 outline-none transition" value={inputs.text} onChange={e => setInputs({ ...inputs, text: e.target.value })} placeholder={placeholder} />}
        {type === 'topic' && <input className="w-full border border-slate-200 p-4 rounded-xl bg-slate-50 mb-5 focus:ring-2 ring-indigo-500 outline-none transition" value={inputs.topic} onChange={e => setInputs({ ...inputs, topic: e.target.value })} placeholder={placeholder} />}
        {type === 'file' && <div className="bg-indigo-50 text-indigo-700 border border-indigo-100 p-4 rounded-xl mb-5 text-sm font-bold flex gap-3 items-center"><FileText size={20} /> {fileName}</div>}

        <div className="grid grid-cols-2 gap-5 mb-5">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase block mb-1.5 tracking-wider">Preguntas</label>
            <div className="flex items-center gap-3 border border-slate-200 p-3 rounded-xl bg-slate-50">
              <FileQuestion size={18} className="text-slate-400" />
              <input type="number" min="1" max="10" className="bg-transparent w-full outline-none font-bold text-slate-700" value={inputs.numQ} onChange={e => setInputs({ ...inputs, numQ: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase block mb-1.5 tracking-wider">Dificultad</label>
            <div className="flex items-center gap-3 border border-slate-200 p-3 rounded-xl bg-slate-50">
              <span className="text-sm">{inputs.difficulty === "Fácil" ? "🟢" : inputs.difficulty === "Medio" ? "🟡" : "🔴"}</span>
              <select className="bg-transparent w-full outline-none font-bold text-slate-700" value={inputs.difficulty} onChange={(e) => setInputs({ ...inputs, difficulty: e.target.value })}>
                <option value="Fácil">Fácil</option><option value="Medio">Medio</option><option value="Difícil">Difícil</option>
              </select>
            </div>
          </div>
        </div>

        {isTeacher && (
          <div className="relative mb-8 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <label className="text-xs font-bold text-indigo-600 uppercase block mb-3 tracking-wider flex items-center gap-2"><Users size={14} /> Asignar a Estudiante</label>
            <div className="flex gap-2 mb-3">
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-2 w-2/3">
                <Filter size={16} className="text-slate-400" />
                <select className="bg-transparent text-xs font-bold text-slate-600 outline-none w-full cursor-pointer" value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)}>
                  <option value="Todos">Todos los Años</option><option value="1er Año">1er Año</option><option value="2do Año">2do Año</option><option value="3er Año">3er Año</option><option value="4to Año">4to Año</option><option value="5to Año">5to Año</option>
                </select>
              </div>
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-2 w-1/3">
                <span className="text-xs font-bold text-slate-400">Sec:</span>
                <select className="bg-transparent text-xs font-bold text-slate-600 outline-none w-full cursor-pointer" value={filterSection} onChange={(e) => setFilterSection(e.target.value)}>
                  <option value="Todos">Todas</option><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white border border-slate-200 p-3 rounded-xl focus-within:ring-2 ring-indigo-500 transition">
              <UserPlus size={18} className="text-slate-400" />
              <input type="text" placeholder="Escribe nombre..." className="bg-transparent w-full outline-none text-sm font-medium text-slate-700 placeholder:text-slate-400" value={inputs.assignTo} onChange={handleAssignChange} autoComplete="off" />
            </div>
            {showSuggestions && (
              <div className="absolute top-full left-0 w-full bg-white border border-slate-200 rounded-xl shadow-xl mt-1 z-50 overflow-hidden max-h-40 overflow-y-auto">
                {suggestions.map((u, i) => (
                  <div key={i} onClick={(e) => { e.stopPropagation(); selectUser(u.email); }} className="p-3 hover:bg-indigo-50 cursor-pointer border-b border-slate-50 last:border-0 flex justify-between items-center">
                    <div><span className="font-bold text-sm block text-slate-700">{u.name}</span><span className="text-xs text-slate-400">{u.email}</span></div>
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded">{u.grade || "S/G"} {u.section ? `- Sec. ${u.section}` : ""}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition">Cancelar</button>
          <button onClick={onConfirm} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition">{inputs.assignTo && isTeacher ? "Asignar Tarea" : "Generar Contenido"}</button>
        </div>
      </div>
    </div>
  );
};