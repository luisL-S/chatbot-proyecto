from app.domain.entities.user import User

class MongoUserRepository:
    def __init__(self, db):
        self.collection = db["users"]

    async def get_by_email(self, email: str):
        document = await self.collection.find_one({"email": email})
        
        if document:
            # --- FIX 1: Convertir ObjectId a String ---
            # MongoDB devuelve un objeto ObjectId, pero Pydantic quiere un String.
            # Lo convertimos a texto aquí mismo.
            if "_id" in document:
                document["_id"] = str(document["_id"])

            # --- FIX 2: Evitar error si falta la contraseña ---
            # Si encontramos un usuario viejo sin 'hashed_password', 
            # retornamos None (como si no existiera) para evitar el Error 500.
            if "hashed_password" not in document:
                print(f"⚠️ Usuario corrupto detectado (sin password): {email}")
                return None

            return User(**document)
        
        return None

    async def save(self, user: User):
        user_dict = user.model_dump(by_alias=True)
        await self.collection.insert_one(user_dict)