from app.infrastructure.ai.gemini_client import GeminiClient
import json
import re

class EvaluateComprension:
    def __init__(self, ai_client: GeminiClient):
        self.ai_client = ai_client

    async def execute(self, original_text: str, question: str, user_answer: str) -> dict:
        # 1. Prompt de Evaluación
        prompt = f"""
        Actúa como un profesor que evalúa comprensión lectora.
        
        TEXTO ORIGINAL: "{original_text}"
        PREGUNTA: "{question}"
        RESPUESTA DEL ESTUDIANTE: "{user_answer}"
        
        TAREA:
        Evalúa la respuesta del 1 al 10. La respuesta debe basarse SOLO en el texto proporcionado.
        
        FORMATO OBLIGATORIO (JSON puro, sin bloques de código):
        {{
            "score": 8,
            "feedback": "Explicación breve de por qué esa nota.",
            "correction": "Si la nota es baja, escribe la respuesta ideal. Si es perfecta, pon null."
        }}
        """

        raw_response = await self.ai_client.generate_response(prompt)

        # 2. Limpieza Quirúrgica (Igual que en GenerateQuestions)
        try:
            start = raw_response.find('{')
            end = raw_response.rfind('}') + 1

            if start != -1 and end != -1:
                clean_json = raw_response[start:end]
                return json.loads(clean_json)
            else:
                raise ValueError("No se encontraron llaves JSON")

        except Exception as e:
            print(f"ERROR EVALUACIÓN: {e}")
            return {
                "score": 0,
                "feedback": "Error técnico evaluando la respuesta. Intenta de nuevo.",
                "correction": None
            }