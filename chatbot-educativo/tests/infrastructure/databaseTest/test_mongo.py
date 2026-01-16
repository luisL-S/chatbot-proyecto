import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# 1. Cargar variables de entorno
load_dotenv()
uri = os.getenv("MONGODB_URI")
db_name = os.getenv("MONGODB_DB_NAME", "ChatbotDB")

async def test_connection():
    print("--- 🕵️ INICIANDO DIAGNÓSTICO DE MONGODB ---")
    print(f"1. Buscando URI en .env: {'✅ Encontrado' if uri else '❌ NO ENCONTRADO (Revisa tu archivo .env)'}")
    
    if not uri:
        print("   -> Deteniendo prueba por falta de URI.")
        return

    print(f"2. Intentando conectar a: {uri} ...")
    
    try:
        # Configuración de timeout corto (5 segundos) para no esperar eternamente
        client = AsyncIOMotorClient(uri, serverSelectionTimeoutMS=5000)
        
        # Intentamos obtener información del servidor para forzar la conexión
        info = await client.server_info()
        print(f"3. ¡Conexión EXITOSA! 🎉")
        print(f"   -> Versión de Mongo: {info.get('version')}")
        
        # Verificar la base de datos
        db = client[db_name]
        collections = await db.list_collection_names()
        print(f"4. Base de datos '{db_name}' verificada.")
        print(f"   -> Colecciones existentes: {collections}")
        
        if "users" in collections:
            count = await db["users"].count_documents({})
            print(f"   -> Usuarios registrados actualmente: {count}")
        else:
            print("   -> ⚠️ La colección 'users' aún no existe (se creará al primer registro).")

    except Exception as e:
        print("\n❌ ERROR DE CONEXIÓN:")
        print(f"   {e}")
        print("\nPOSIBLES SOLUCIONES:")
        print("   A) Tu MongoDB no está corriendo (Revisa Servicios de Windows).")
        print("   B) La URI en .env está mal escrita.")
        print("   C) Un Firewall está bloqueando el puerto 27017.")

if __name__ == "__main__":
    asyncio.run(test_connection())