import io

# Intentamos importar. Si fallan, no rompemos el servidor, pero avisamos.
try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None

try:
    import docx
except ImportError:
    docx = None

try:
    from PIL import Image
    import pytesseract
    # OJO: En Windows, a veces hay que decir dónde está instalado Tesseract
    # pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
except ImportError:
    Image = None

def extract_text_from_pdf(file_file) -> str:
    print("--- Procesando PDF ---")
    if PdfReader is None:
        return "Error: Librería 'pypdf' no instalada."
    
    try:
        # Leemos el archivo en memoria
        content = file_file.read()
        pdf_content = io.BytesIO(content)
        reader = PdfReader(pdf_content)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        print(f"PDF Leído: {len(text)} caracteres extraídos.")
        return text
    except Exception as e:
        print(f"❌ Error leyendo PDF: {e}")
        return ""

def extract_text_from_docx(file_file) -> str:
    print("--- Procesando DOCX ---")
    if docx is None:
        return "Error: Librería 'python-docx' no instalada."

    try:
        content = file_file.read()
        doc_content = io.BytesIO(content)
        doc = docx.Document(doc_content)
        text = "\n".join([para.text for para in doc.paragraphs])
        print(f"DOCX Leído: {len(text)} caracteres extraídos.")
        return text
    except Exception as e:
        print(f"❌ Error leyendo DOCX: {e}")
        return ""

def extract_text_from_image(file_file) -> str:
    print("--- Procesando IMAGEN ---")
    if Image is None:
        return "Error: Librería 'Pillow' o 'pytesseract' no instalada."

    try:
        image = Image.open(file_file.file)
        text = pytesseract.image_to_string(image)
        print(f"Imagen Leída: {len(text)} caracteres extraídos.")
        if not text.strip():
            return "La imagen se leyó, pero no se encontró texto claro."
        return text
    except Exception as e:
        print(f"❌ Error leyendo Imagen: {e}")
        print("NOTA: Para leer imágenes en Windows necesitas instalar Tesseract OCR exe.")
        return "Error procesando imagen (¿Tienes Tesseract instalado en Windows?)"