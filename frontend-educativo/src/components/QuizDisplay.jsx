import React, { useState } from 'react';

export default function QuizDisplay({ quizData }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  // Si quizData viene como texto JSON, lo convertimos a objeto real
  const questions = typeof quizData === 'string' ? JSON.parse(quizData) : quizData;

  const currentQuestion = questions[currentIndex];

  const handleOptionClick = (option) => {
    if (showFeedback) return; // Evitar doble click
    setSelectedOption(option);
    setShowFeedback(true);

    // Verificamos si la respuesta coincide con la correcta (tomamos la letra inicial A, B, C...)
    // Asumimos que "answer" viene como "B) La respuesta..."
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

  if (finished) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-md border border-purple-100 text-center animate-fade-in">
        <h3 className="text-2xl font-bold text-purple-700 mb-2">¡Examen Terminado! 🎉</h3>
        <p className="text-gray-600 mb-4">Tu puntuación final es:</p>
        <div className="text-5xl font-extrabold text-purple-600 mb-4">
          {score} / {questions.length}
        </div>
        <p className="text-sm text-gray-400">Sigue practicando para mejorar tu comprensión lectora.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden max-w-2xl w-full my-4 mx-auto">
      {/* Barra de progreso */}
      <div className="w-full bg-gray-200 h-2">
        <div 
          className="bg-purple-600 h-2 transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        ></div>
      </div>

      <div className="p-6">
        {/* Pregunta */}
        <div className="mb-6">
          <span className="text-xs font-bold text-purple-500 uppercase tracking-wide">
            Pregunta {currentIndex + 1} de {questions.length}
          </span>
          <h3 className="text-lg font-bold text-gray-800 mt-2 leading-relaxed">
            {currentQuestion.question}
          </h3>
        </div>

        {/* Opciones */}
        <div className="space-y-3">
          {currentQuestion.options.map((option, idx) => {
            const isSelected = selectedOption === option;
            const isCorrect = option.startsWith(currentQuestion.answer.charAt(0)); // Chequeo simple por letra
            
            let btnClass = "w-full text-left p-4 rounded-lg border-2 transition-all duration-200 flex items-center ";
            
            if (showFeedback) {
              if (isCorrect) btnClass += "border-green-500 bg-green-50 text-green-700 font-medium";
              else if (isSelected) btnClass += "border-red-500 bg-red-50 text-red-700";
              else btnClass += "border-gray-100 text-gray-400 opacity-60";
            } else {
              btnClass += "border-gray-100 hover:border-purple-300 hover:bg-purple-50 text-gray-700";
            }

            return (
              <button
                key={idx}
                onClick={() => handleOptionClick(option)}
                disabled={showFeedback}
                className={btnClass}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm font-bold border ${
                  showFeedback && isCorrect ? "bg-green-500 text-white border-green-500" : 
                  "bg-white text-gray-500 border-gray-300"
                }`}>
                  {String.fromCharCode(65 + idx)}
                </div>
                {option.substring(3) /* Quitamos el A) del texto para que se vea limpio */} 
              </button>
            );
          })}
        </div>

        {/* Retroalimentación (Feedback) */}
        {showFeedback && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100 animate-fade-in-up">
            <h4 className="font-bold text-blue-800 mb-1 flex items-center">
              💡 Explicación del Tutor:
            </h4>
            <p className="text-blue-700 text-sm leading-relaxed">
              {currentQuestion.explanation}
            </p>
            <button
              onClick={handleNext}
              className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm"
            >
              {currentIndex < questions.length - 1 ? "Siguiente Pregunta →" : "Ver Resultados 🏆"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}