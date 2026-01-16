import io
from docx import Document
from pypdf import PdfReader
from PIL import Image
from fastapi import UploadFile, HTTPException
import google.generativeai as genai
import os

# Configuración
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

class DocumentProcessor:
    
    @staticmethod
    async def extract_text(file: UploadFile) -> str:
        filename = file.filename.lower()
        content = await file.read()
        file_stream = io.BytesIO(content)
        
        text = ""
        print(f"Procesando archivo: {filename}")

        try:
            # CASO 1: PDF (pypdf)
            if filename.endswith(".pdf"):
                reader = PdfReader(file_stream)
                for page in reader.pages:
                    extracted = page.extract_text()
                    if extracted:
                        text += extracted + "\n"

            # CASO 2: WORD (python-docx)
            elif filename.endswith(".docx"):
                doc = Document(file_stream)
                text = "\n".join([para.text for para in doc.paragraphs])

            # CASO 3: IMÁGENES (Gemini Vision)
            elif filename.endswith((".jpg", ".jpeg", ".png", ".webp")):
                try:
                    image = Image.open(file_stream)
                    vision_model = genai.GenerativeModel('gemini-2.5-flash') 
                    response = await vision_model.generate_content_async([
                        "Transcribe el texto de esta imagen.", 
                        image
                    ])
                    text = response.text
                except Exception as img_error:
                    print(f"Error específico de imagen: {img_error}")
                    raise HTTPException(status_code=400, detail="Error leyendo la imagen. Verifica tu API Key o modelo.")

            # CASO 4: TEXTO PLANO
            elif filename.endswith(".txt"):
                text = content.decode("utf-8")
            
            # CASO 5: EJECUTABLES (Archivos prohibidos)
            elif filename.endswith(".exe"):
                 raise HTTPException(status_code=400, detail="No se permiten archivos ejecutables (.exe) por seguridad.")

        except HTTPException as he:
            raise he
        except Exception as e:
            print(f"Error leyendo archivo: {e}")
            raise HTTPException(status_code=400, detail=f"No se pudo leer el archivo: {str(e)}")

        # Validación final
        if not text or len(text.strip()) < 10:
            raise HTTPException(status_code=400, detail="El archivo está vacío o no tiene texto legible.")

        return text