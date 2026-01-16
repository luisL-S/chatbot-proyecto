from abc import ABC, abstractmethod
from typing import List, Optional
from app.domain.entities.conversation import Conversation

class ConversationRepository(ABC):
    
    @abstractmethod
    async def save(self, conversation: Conversation) -> None:
        pass

    @abstractmethod
    async def get_by_id(self, id: str) -> Optional[Conversation]:
        pass

    # Esta es la nueva función que agregamos
    @abstractmethod
    async def get_all_by_user(self, user_id: str) -> List[Conversation]:
        pass