import os
import json
import docx  # La librería que acabamos de instalar
from typing import Dict, Any

class GenerateQuestions:
    def __init__(self, ai_client, quiz_repo):
        self.ai_client = ai_client
        self.quiz_repo = quiz_repo

    async def execute(self, file_path: str) -> Dict[str, Any]:
        
        if not os.path.exists(file_path):
            raise FileNotFoundError("No se encontró el archivo.")

        # --- ESTRATEGIA DE PROMPT (Común para todos) ---
        base_instructions = """
        Actúa como un profesor experto en Didáctica de la Lengua y Comprensión Lectora.
        Tu tarea es crear un examen de 7 preguntas basado EXCLUSIVAMENTE en el contenido proporcionado.

        INSTRUCCIONES PEDAGÓGICAS:
        1. Las preguntas deben variar en dificultad:
           - 2 preguntas de nivel LITERAL (información explícita en el texto).
           - 2 preguntas de nivel INFERENCIAL (requieren deducir o relacionar ideas).
           - 1 pregunta de nivel CRÍTICO/SINTÉTICO (idea principal o propósito del autor).
        2. Las opciones incorrectas (distractores) deben ser plausibles pero claramente falsas según el texto.

        FORMATO DE RESPUESTA (JSON ESTRICTO):
        Tu respuesta debe ser ÚNICAMENTE un objeto JSON válido con esta estructura exacta:
        {
            "title": "Título sugerido para el texto",
            "questions": [
                {
                    "question": "¿Enunciado de la pregunta?",
                    "options": ["A) Opción 1", "B) Opción 2", "C) Opción 3", "D) Opción 4"],
                    "correct_letter": "A"
                }
            ]
        }
        """

        try:
            response_text = ""
            
            # --- LÓGICA DE SELECCIÓN DE TIPO ---
            
            # CASO 1: ARCHIVOS WORD (.docx)
            if file_path.endswith(".docx"):
                # Extraemos el texto con Python
                doc_text = self._extract_text_from_docx(file_path)
                
                # Combinamos instrucciones + contenido del Word
                full_prompt = f"{base_instructions}\n\nCONTENIDO DEL DOCUMENTO:\n{doc_text}"
                
                # Enviamos solo texto a Gemini
                response_text = await self.ai_client.generate_response(prompt=full_prompt)

            # CASO 2: PDF O IMÁGENES (.pdf, .jpg, .png)
            else:
                # Leemos el archivo en bytes (Gemini lo procesará visualmente)
                with open(file_path, "rb") as f:
                    file_bytes = f.read()

                # Determinamos MIME type
                mime_type = "application/pdf" if file_path.endswith(".pdf") else "image/jpeg"
                if file_path.endswith(".png"):
                    mime_type = "image/png"

                # Enviamos instrucciones + archivo adjunto a Gemini
                response_text = await self.ai_client.generate_response(
                    prompt=base_instructions, 
                    image_bytes=file_bytes, 
                    mime_type=mime_type
                )

            # --- LIMPIEZA Y RETORNO (Igual que antes) ---
            return self._clean_and_parse_json(response_text)

        except Exception as e:
            print(f"Error procesando archivo: {e}")
            raise e

    # --- MÉTODOS AUXILIARES (Para mantener el código ordenado) ---

    def _extract_text_from_docx(self, path: str) -> str:
        """Abre un .docx y saca todo el texto de los párrafos."""
        doc = docx.Document(path)
        full_text = []
        for para in doc.paragraphs:
            if para.text.strip(): # Solo párrafos con texto
                full_text.append(para.text)
        return "\n".join(full_text)

    def _clean_and_parse_json(self, raw_text: str) -> Dict[str, Any]:
        """Limpia la respuesta de la IA y la convierte a Diccionario."""
        clean_text = raw_text.strip()
        
        # Quitamos bloques de código Markdown
        if clean_text.startswith("```json"):
            clean_text = clean_text[7:]
        elif clean_text.startswith("```"):
            clean_text = clean_text[3:]
        
        if clean_text.endswith("```"):
            clean_text = clean_text[:-3]

        return json.loads(clean_text.strip())