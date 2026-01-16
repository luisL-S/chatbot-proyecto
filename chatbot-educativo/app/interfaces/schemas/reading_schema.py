from pydantic import BaseModel
from typing import List

# --- Input: Para generar el cuestionario ---
class TextSubmission(BaseModel):
    text: str
    difficulty: str = "medio" # facil, medio, dificil

# --- Output: Las preguntas generadas ---
class QuestionGenerated(BaseModel):
    id: int
    question: str

class QuizResponse(BaseModel):
    questions: List[QuestionGenerated]
    original_text: str  # <--- Nuevo campo para la evaluación futura

# --- Input: Para evaluar una respuesta ---
class AnswerSubmission(BaseModel):
    original_text: str
    question: str
    user_answer: str

# --- Output: La corrección ---
class EvaluationResponse(BaseModel):
    score: int # 1 al 10
    feedback: str
    correction: str | None = None