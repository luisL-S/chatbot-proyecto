import React, { useState, useEffect } from 'react';

export default function QuizDisplay({ quizData }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  
  // ESTADO NUEVO: Para guardar la reflexión del profesor
  const [teacherFeedback, setTeacherFeedback] = useState("");
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  // Parsear datos si vienen como string
  const questions = typeof quizData === 'string' ? JSON.parse(quizData) : quizData;
  const currentQuestion = questions[currentIndex];

  // --- EFECTO: CUANDO TERMINA EL EXAMEN, PEDIR FEEDBACK ---
  useEffect(() => {
    if (finished) {
      fetchFeedback();
    }
  }, [finished]);

  const fetchFeedback = async () => {
    setLoadingFeedback(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://127.0.0.1:8000/api/reading/feedback-analysis', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          score: score,
          total: questions.length,
          topic: questions[0].question // Usamos la primera pregunta como contexto del tema
        })
      });
      
      const data = await response.json();
      setTeacherFeedback(data.feedback);
    } catch (error) {
      console.error("Error obteniendo feedback:", error);
    } finally {
      setLoadingFeedback(false);
    }
  };

  const handleOptionClick = (option) => {
    if (showFeedback) return;
    setSelectedOption(option);
    setShowFeedback(true);

    const correctLetter = currentQuestion.answer.charAt(0).toUpperCase(); 
    const selectedLetter = option.charAt(0).toUpperCase();

    if (selectedLetter === correctLetter) {
      setScore(score + 1);
    }
  };

  const handleNext = () => {
    setSelectedOption(null);
    setShowFeedback(false);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setFinished(true);
    }
  };

  // --- VISTA FINAL (RESULTADOS) ---
  if (finished) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-lg border border-purple-100 text-center animate-fade-in max-w-2xl mx-auto my-6">
        <div className="mb-6">
          <div className="inline-block p-4 rounded-full bg-purple-50 mb-4 text-4xl">
            🏆
          </div>
          <h3 className="text-3xl font-bold text-gray-800 mb-2">¡Examen Completado!</h3>
          <p className="text-gray-500">Aquí tienes tu resultado final</p>
        </div>

        {/* PUNTUACIÓN GRANDE */}
        <div className="flex justify-center items-end gap-2 mb-8">
          <span className="text-6xl font-extrabold text-purple-600">{score}</span>
          <span className="text-2xl text-gray-400 font-medium mb-2">/ {questions.length}</span>
        </div>

        {/* --- SECCIÓN NUEVA: REFLEXIÓN DEL DOCENTE --- */}
        <div className="bg-blue-50 rounded-xl p-6 text-left border border-blue-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
          <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
            👨‍🏫 Análisis del Docente IA:
          </h4>
          
          {loadingFeedback ? (
            <div className="flex items-center gap-2 text-blue-600 animate-pulse">
              <span>✍️ Redactando tu retroalimentación personalizada...</span>
            </div>
          ) : (
            <p className="text-blue-800 leading-relaxed text-sm md:text-base">
              {teacherFeedback || "Analizando tu desempeño..."}
            </p>
          )}
        </div>

        <button 
          onClick={() => window.location.reload()} // O cualquier acción para reiniciar
          className="mt-8 px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition font-bold shadow-md"
        >
          Intentar otra lectura 🔄
        </button>
      </div>
    );
  }

  // --- VISTA NORMAL (PREGUNTAS) ---
  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden max-w-2xl w-full my-4 mx-auto">
      {/* Barra de progreso */}
      <div className="w-full bg-gray-100 h-2">
        <div 
          className="bg-purple-600 h-2 transition-all duration-500 ease-out"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        ></div>
      </div>

      <div className="p-6 md:p-8">
        <div className="flex justify-between items-center mb-6">
          <span className="px-3 py-1 bg-purple-50 text-purple-600 text-xs font-bold rounded-full uppercase tracking-wide">
            Pregunta {currentIndex + 1} / {questions.length}
          </span>
        </div>

        <h3 className="text-xl font-bold text-gray-800 mb-8 leading-relaxed">
          {currentQuestion.question}
        </h3>

        <div className="space-y-3">
          {currentQuestion.options.map((option, idx) => {
            const isSelected = selectedOption === option;
            const isCorrect = option.startsWith(currentQuestion.answer.charAt(0));
            
            let btnClass = "w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center group ";
            
            if (showFeedback) {
              if (isCorrect) btnClass += "border-green-500 bg-green-50 text-green-800";
              else if (isSelected) btnClass += "border-red-500 bg-red-50 text-red-800";
              else btnClass += "border-gray-100 text-gray-400 opacity-50";
            } else {
              btnClass += "border-gray-100 hover:border-purple-400 hover:bg-purple-50 text-gray-700";
            }

            return (
              <button
                key={idx}
                onClick={() => handleOptionClick(option)}
                disabled={showFeedback}
                className={btnClass}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-4 text-sm font-bold border transition-colors ${
                  showFeedback && isCorrect ? "bg-green-500 text-white border-green-500" : 
                  showFeedback && isSelected ? "bg-red-500 text-white border-red-500" :
                  "bg-white text-gray-400 border-gray-200 group-hover:border-purple-400 group-hover:text-purple-600"
                }`}>
                  {String.fromCharCode(65 + idx)}
                </div>
                <span className="font-medium">{option.substring(3)}</span>
              </button>
            );
          })}
        </div>

        {showFeedback && (
          <div className="mt-6 p-5 bg-blue-50 rounded-xl border border-blue-100 animate-fade-in-up">
            <h4 className="font-bold text-blue-800 mb-2 text-sm flex items-center gap-2">
              💡 Explicación:
            </h4>
            <p className="text-blue-700 text-sm leading-relaxed mb-4">
              {currentQuestion.explanation}
            </p>
            <button
              onClick={handleNext}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-md hover:shadow-lg transform active:scale-95"
            >
              {currentIndex < questions.length - 1 ? "Siguiente Pregunta →" : "Ver Resultados 🏆"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}