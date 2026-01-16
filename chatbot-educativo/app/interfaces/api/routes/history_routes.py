from fastapi import APIRouter, Depends, HTTPException
from app.interfaces.api.dependencies import get_history_use_case

router = APIRouter()

@router.get("/{conversation_id}")
def get_conversation_history(
    conversation_id: str,
    history_use_case=Depends(get_history_use_case)
):
    try:
        return history_use_case.execute(conversation_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))