import os
import google.generativeai as genai
from dotenv import load_dotenv
import json
import re

load_dotenv()

class GeminiClient:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            print("⚠️ ADVERTENCIA: GEMINI_API_KEY no encontrada")
        
        genai.configure(api_key=api_key)

        # Usamos gemini-2.5-flash (Tu configuración original)
        self.model_name = 'gemini-2.5-flash' 
        
        try:
            self.model = genai.GenerativeModel(
                model_name=self.model_name,
                system_instruction="Eres EduBot, un profesor experto. Tu objetivo es evaluar y enseñar comprensión lectora con precisión pedagógica."
            )
            print(f"✅ IA Conectada: {self.model_name}")
        except Exception as e:
            print(f"❌ Error conectando 2.5, usando fallback: {e}")
            self.model = genai.GenerativeModel('gemini-1.5-flash')

    def _clean_json(self, text: str):
        """Limpieza robusta."""
        try:
            text = text.replace("```json", "").replace("```", "").strip()
            start = text.find("[")
            end = text.rfind("]")
            if start != -1 and end != -1:
                return json.loads(text[start : end + 1])
            return json.loads(text)
        except Exception as e:
            print(f"⚠️ Error JSON IA: {e}")
            return [{
                "question": "Ocurrió un error al procesar el texto.",
                "options": ["Reintentar", "Error", "Error", "Error"],
                "answer": "Reintentar",
                "explanation": "La IA no pudo estructurar el examen correctamente."
            }]

    # --- 1. GENERAR LECCIÓN (INTACTO) ---
    async def generate_lesson_content(self, topic: str,difficulty: str = "Medio") -> str:
        prompt = f"""
        Actúa como un docente experto de secundaria.
        Escribe un artículo educativo breve y moderno sobre: "{topic}".
        NIVEL DE DIFICULTAD: {difficulty}
        - Si es "Fácil": Usa lenguaje muy simple, analogías divertidas y párrafos cortos (para niños/principiantes).
        - Si es "Medio": Tono estándar de secundaria, vocabulario académico moderado.
        - Si es "Difícil": Tono universitario/técnico, análisis profundo y vocabulario avanzado.
        
        Requisitos Pedagógicos:
        1. Adaptado a jóvenes (vocabulario claro, no rebuscado).
        2. Enfoque actual (relacionado con la realidad, valores o tecnología si aplica).
        3. Estructura: Título atractivo, Introducción, 3 Puntos Clave, Conclusión reflexiva.
        4. Extensión: Máximo 350 palabras.
        
        Usa formato Markdown limpio.
        """
        try:
            response = await self.model.generate_content_async(prompt)
            return response.text
        except Exception as e:
            return f"No se pudo generar el contenido. Error: {e}"

    # --- 2. EXAMEN DESDE TEXTO (AGREGADO num_questions) ---
    async def generate_quiz(self, text_content: str, num_questions: int = 5, difficulty: str = "Medio"):
        # NOTA: Inyectamos {num_questions} pero mantenemos TU prompt original
        prompt = f"""
        Genera un examen de EXACTAMENTE {num_questions} preguntas basado en este texto.
        NIVEL DE DIFICULTAD: {difficulty}
        - Fácil: Preguntas directas y literales. Opciones obvias.
        - Medio: Mezcla de literales e inferenciales.
        - Difícil: Mayoría de preguntas críticas/inferenciales. Opciones distractores complejos ("trampas").
        
        CRITERIOS PEDAGÓGICOS OBLIGATORIOS:
        - Preguntas de Nivel Literal, Inferencial y Crítico (distribuidas).
        - NO USES PREGUNTAS GENÉRICAS. Deben ser específicas de este texto.
        
        !!! IMPORTANTE SOBRE EL FEEDBACK ("explanation") !!!:
        - La explicación NO puede ser genérica como "se deduce del texto".
        - Debe explicar explícitamente POR QUÉ esa opción es la correcta citando una pista del texto o la lógica usada.
        - Ejemplo CORRECTO: "Es correcta porque en el segundo párrafo el autor menciona que los árboles mueren de pie, lo que simboliza resistencia."
        
        FORMATO JSON ARRAY OBLIGATORIO:
        [
            {{
                "question": "¿Pregunta?",
                "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
                "answer": "A) ...", 
                "explanation": "Explicación detallada..."
            }}
        ]

        TEXTO: "{text_content[:20000]}"
        """
        try:
            response = await self.model.generate_content_async(
                prompt,
                generation_config=genai.types.GenerationConfig(temperature=0.2)
            )
            return self._clean_json(response.text)
        except Exception as e:
            print(f"❌ Error Quiz Texto: {e}")
            return []

    # --- 3. EXAMEN DESDE IMAGEN (AGREGADO num_questions) ---
    async def generate_quiz_from_image(self, image_bytes: bytes, mime_type: str, num_questions: int = 5,difficulty: str = "Medio"):
        prompt = f"""
        Analiza esta imagen educativa. Genera un examen de {num_questions} preguntas.
        NIVEL DE DIFICULTAD: {difficulty}.

        CRITERIOS PEDAGÓGICOS:
        - Si hay texto: Preguntas Literales, Inferenciales y Críticas.
        - Si es gráfico: Análisis de datos visuales.
        - EXPLICACIÓN: Detalla por qué la respuesta es correcta en el campo "explanation".

        FORMATO JSON ARRAY OBLIGATORIO:
        [
            {{
                "question": "¿Pregunta?",
                "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
                "answer": "A) ...",
                "explanation": "Explicación detallada."
            }}
        ]
        """
        try:
            response = await self.model.generate_content_async([
                prompt,
                {"mime_type": mime_type, "data": image_bytes}
            ])
            return self._clean_json(response.text)
        except Exception as e:
            print(f"❌ Error Quiz Imagen: {e}")
            return []

    # --- 4. FEEDBACK FINAL (INTACTO) ---
    async def generate_final_feedback(self, score: int, total: int, topic: str) -> str:
        prompt = f"""
        Un estudiante obtuvo {score}/{total} en un examen sobre "{topic}".
        
        Actúa como su tutor personal. Tu respuesta será leída directamente por el alumno.
        Escribe un feedback de 3 partes (usa Markdown):
        
        1. **Evaluación:** (Ej: "¡Excelente trabajo!" o "Buen esfuerzo").
        2. **Análisis:** Explica brevemente qué significa su nota (si falló, anímalo a leer entre líneas; si acertó, felicita su pensamiento crítico).
        3. **Consejo:** Un tip rápido para mejorar en la próxima lectura.
        
        Extensión: Máximo 80 palabras.
        """
        try:
            response = await self.model.generate_content_async(prompt)
            return response.text
        except Exception:
            return "¡Sigue practicando! La lectura es clave."
        
    async def generate_content(self, prompt: str) -> str:
        """Genera una respuesta de texto simple para el chat"""
        try:
            # Usamos el modelo para generar contenido (asíncrono)
            response = await self.model.generate_content_async(prompt)
            return response.text
        except Exception as e:
            print(f"Error en Gemini Chat: {e}")
            return "Lo siento, estoy teniendo problemas para conectar con mi cerebro digital. Intenta de nuevo."

def get_gemini_client():
    return GeminiClient()