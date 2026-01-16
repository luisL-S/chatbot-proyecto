import google.generativeai as genai
import os
from dotenv import load_dotenv

# Cargar API Key
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("❌ ERROR: No se encontró la GEMINI_API_KEY en el archivo .env")
else:
    print(f"✅ API Key encontrada: {api_key[:5]}...*****")
    
    try:
        genai.configure(api_key=api_key)
        
        print("\n🔍 Consultando modelos disponibles en Google AI...")
        available_models = []
        
        for m in genai.list_models():
            # Filtramos solo los que sirven para generar texto (chat)
            if 'generateContent' in m.supported_generation_methods:
                print(f"   - {m.name}")
                available_models.append(m.name)
        
        if not available_models:
            print("\n⚠️ No se encontraron modelos compatibles con 'generateContent'.")
            print("   -> Verifica que tu API Key sea válida y tenga permisos.")
        else:
            print("\n💡 SUGERENCIA: Copia uno de los nombres de arriba (ej: 'models/gemini-pro')")
            print("   y pégalo en tu archivo 'gemini_client.py'.")

    except Exception as e:
        print(f"\n❌ ERROR CONECTANDO: {e}")