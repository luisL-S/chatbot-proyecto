import { useState } from 'react';

// Aceptamos una nueva prop: onRequestFeedback
export default function QuizRenderer({ quizData, onRequestFeedback }) {
  const [userAnswers, setUserAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [feedbackRequested, setFeedbackRequested] = useState(false); // Para no pedirlo 2 veces

  if (!quizData || !quizData.questions) return null;

  const handleSelect = (questionIndex, letter) => {
    if (showResults) return;
    setUserAnswers({
      ...userAnswers,
      [questionIndex]: letter
    });
  };

  const calculateScore = () => {
    let score = 0;
    quizData.questions.forEach((q, index) => {
      if (userAnswers[index] === q.correct_letter) {
        score++;
      }
    });
    return score;
  };

  // --- LÓGICA DE RETROALIMENTACIÓN ---
  const handleAskFeedback = () => {
    setFeedbackRequested(true);
    const score = calculateScore();
    const total = quizData.questions.length;
    
    // Armamos un resumen de los errores para que el bot sepa qué corregir
    const mistakes = quizData.questions
      .map((q, i) => {
        if (userAnswers[i] !== q.correct_letter) {
          return `Pregunta ${i+1}: Respondí ${userAnswers[i] || 'nada'}, la correcta era ${q.correct_letter}.`;
        }
        return null;
      })
      .filter(Boolean) // Filtramos solo los errores
      .join(" ");

    // Llamamos a la función del padre (ChatPage)
    if (onRequestFeedback) {
      onRequestFeedback(score, total, mistakes);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg w-full my-4 border-l-4 border-blue-500">
      <h2 className="text-xl font-bold text-gray-800 mb-4">{quizData.title}</h2>

      <div className="space-y-6">
        {quizData.questions.map((q, index) => (
          <div key={index} className="border-b pb-4 last:border-0">
            <p className="font-semibold text-gray-700 mb-3">{index + 1}. {q.question}</p>
            
            <div className="space-y-2">
              {q.options.map((opt) => {
                const letter = opt.charAt(0); 
                const isSelected = userAnswers[index] === letter;
                const isCorrect = q.correct_letter === letter;
                
                let btnClass = "w-full text-left p-3 rounded border transition-all text-sm ";
                
                if (showResults) {
                  if (isCorrect) btnClass += "bg-green-100 border-green-500 text-green-800 font-bold";
                  else if (isSelected && !isCorrect) btnClass += "bg-red-100 border-red-500 text-red-800";
                  else btnClass += "opacity-50 border-gray-200";
                } else {
                  if (isSelected) btnClass += "bg-blue-100 border-blue-500 text-blue-800";
                  else btnClass += "hover:bg-gray-50 border-gray-200";
                }

                return (
                  <button key={opt} onClick={() => handleSelect(index, letter)} className={btnClass} disabled={showResults}>
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* FOOTER CON LOS BOTONES DE ACCIÓN */}
      <div className="mt-6 pt-4 border-t flex flex-col gap-4 items-center">
        {!showResults ? (
          <button 
            onClick={() => setShowResults(true)}
            className="bg-blue-600 text-white px-8 py-2 rounded-full hover:bg-blue-700 font-bold shadow transition"
          >
            Corregir Examen
          </button>
        ) : (
          <div className="text-center w-full">
            <div className="text-2xl font-bold mb-4">
              Tu nota: <span className="text-blue-600">{calculateScore()} / {quizData.questions.length}</span>
            </div>
            
            {/* NUEVO BOTÓN: PEDIR RETROALIMENTACIÓN */}
            {!feedbackRequested ? (
                <button 
                    onClick={handleAskFeedback}
                    className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 font-medium shadow-md flex items-center gap-2 mx-auto animate-bounce"
                >
                    Pedir Retroalimentación al Bot
                </button>
            ) : (
                <p className="text-sm text-gray-500 italic">Solicitando análisis...</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}