from app.infrastructure.database.mongo.base_repository import BaseMongoRepository

class MessageRepositoryImpl(BaseMongoRepository):
    @property
    def collection(self):
        return "mensaje"

    def create(self, message: dict):
        return self.get_collection().insert_one(message)

    def find_by_conversation(self, conversation_id: str):
        return self.get_collection().find({"conversation_id": conversation_id})
