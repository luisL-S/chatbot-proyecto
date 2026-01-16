from typing import Optional, List

class MongoQuizRepository:
    def __init__(self, db):
        # Si usas Motor (Async), es db["quizzes"]
        # Si usas PyMongo, también.
        self.collection = db["quizzes"]

    async def save(self, quiz_data: dict) -> None:
        # Guardamos el quiz generado
        await self.collection.insert_one(quiz_data)

    async def get_by_id(self, quiz_id: str):
        return await self.collection.find_one({"_id": quiz_id})