import os
import google.generativeai as genai
from dotenv import load_dotenv
import json
import re

load_dotenv()

# --- PERSONALIDAD DEL BOT ---
EDU_PROMPT = """
Eres EduBot, un asistente educativo virtual inteligente, paciente y motivador.
Tu misión es ayudar a estudiantes y docentes a facilitar el proceso de aprendizaje.

REGLAS DE COMPORTAMIENTO:
1. IDENTIDAD: Si te preguntan quién eres, responde siempre: "Soy EduBot, tu asistente educativo virtual". Nunca menciones que eres un modelo de Google.
2. TONO: Usa un tono amable, profesional pero cercano. Usa emojis ocasionalmente para ser amigable (🎓, 📚, ✨).
3. PEDAGOGÍA: No des solo las respuestas directas (ej: en matemáticas). Explica el paso a paso o guía al estudiante para que entienda el concepto.
4. FORMATO: Usa Negritas para resaltar conceptos clave y Listas para organizar la información.
5. ALCANCE: Si te preguntan algo fuera del contexto educativo (ej: chismes, ilegalidades), responde educadamente que estás diseñado para ayudar en temas de aprendizaje.
"""

class GeminiClient:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            print("ADVERTENCIA: GEMINI_API_KEY no encontrada")
        
        genai.configure(api_key=api_key)

        # Usamos 2.5-flash como solicitaste
        self.model = genai.GenerativeModel(
            model_name='gemini-2.5-flash', 
            system_instruction=EDU_PROMPT
        )

    # --- 1. CHAT NORMAL ---
    async def generate_response(self, prompt: str, image_bytes: bytes = None, mime_type: str = None) -> str:
        try:
            content = [prompt]
            if image_bytes and mime_type:
                content.append({"mime_type": mime_type, "data": image_bytes})

            response = await self.model.generate_content_async(content)
            return response.text
        except Exception as e:
            print(f"Error Gemini Chat: {e}")
            return f"Error: {str(e)}"   

    # --- 2. GENERAR EXÁMENES (CORREGIDO) ---
    async def generate_quiz(self, text_content: str, num_questions: int = 5):
        prompt = f"""
        Actúa como un profesor experto. Basándote ÚNICAMENTE en el siguiente texto, genera un examen de {num_questions} preguntas de selección múltiple.
        
        TEXTO BASE:
        "{text_content[:15000]}"

        REGLAS OBLIGATORIAS:
        1. Responde ÚNICAMENTE con un JSON válido.
        2. NO escribas "Aquí está el JSON", ni saludos, ni uses bloques de código markdown (```json).
        3. El formato debe ser exactamente una lista de objetos como este:
        [
            {{
                "question": "¿Pregunta?",
                "options": ["A) Opción 1", "B) Opción 2", "C) Opción 3", "D) Opción 4"],
                "answer": "A) Opción 1",
                "explanation": "Explicación breve de por qué es la correcta."
            }}
        ]
        """

        try:
            response = await self.model.generate_content_async(prompt)
            raw_text = response.text
            
            # --- CORRECCIÓN AQUÍ ---
            # _clean_json_response YA devuelve el objeto JSON (lista/diccionario).
            # No hacemos json.loads() aquí de nuevo.
            quiz_data = self._clean_json_response(raw_text)
            
            return quiz_data

        except Exception as e:
            print(f"Error generando quiz: {e}")
            return []

    # --- 3. HELPER PARA LIMPIAR BASURA DE LA IA ---
    def _clean_json_response(self, text: str):
        """Busca el array JSON [...] dentro de todo el texto basura que mande la IA"""
        try:
            # 1. Quitar markdown
            text = text.replace("```json", "").replace("```", "")
            
            # 2. Buscar el primer '[' y el último ']'
            start = text.find("[")
            end = text.rfind("]")
            
            if start != -1 and end != -1:
                clean_json = text[start : end + 1]
                return json.loads(clean_json)
            else:
                # Si no encuentra array, intenta cargar todo
                return json.loads(text)
        except json.JSONDecodeError:
            print(f"Error decodificando JSON. Texto recibido: {text[:100]}...")
            return []