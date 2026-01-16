from fastapi import UploadFile, HTTPException
from pypdf import PdfReader
from docx import Document
import io

class FileReader:
    @staticmethod
    async def extract_text(file: UploadFile) -> str:
        content_type = file.content_type
        filename = file.filename.lower()

        # Leemos el archivo en memoria
        file_bytes = await file.read()
        file_stream = io.BytesIO(file_bytes)
        
        text = ""

        try:
            # Opción 1: Archivos PDF
            if "pdf" in content_type or filename.endswith(".pdf"):
                reader = PdfReader(file_stream)
                for page in reader.pages:
                    extracted = page.extract_text()
                    if extracted:
                        text += extracted + "\n"
            
            # Opción 2: Archivos Word (.docx)
            elif "word" in content_type or "officedocument" in content_type or filename.endswith(".docx"):
                doc = Document(file_stream)
                for para in doc.paragraphs:
                    text += para.text + "\n"
            
            # Opción 3: Archivos de Texto (.txt)
            elif "text/plain" in content_type or filename.endswith(".txt"):
                text = file_bytes.decode("utf-8")
            
            else:
                raise HTTPException(status_code=400, detail="Formato de archivo no soportado. Usa PDF, DOCX o TXT.")

        except Exception as e:
            print(f"Error leyendo archivo: {e}")
            raise HTTPException(status_code=400, detail="El archivo está corrupto o no se puede leer.")
        
        # Validación final
        if len(text.strip()) < 50:
            raise HTTPException(status_code=400, detail="El archivo contiene muy poco texto o es una imagen escaneada sin OCR.")
            
        return text