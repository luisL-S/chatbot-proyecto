class ChatbotService:
    """
    Servicio de dominio encargado de generar respuestas
    educativas para el chatbot.
    """

    def __init__(self, ai_client):
        self.ai_client = ai_client  

    def generate_response(self, user_message: str) -> str:

        prompt = f"""
        Actúa como un tutor educativo especializado en comprensión lectora.
        Tu objetivo es ayudar al estudiante a entender mejor los textos.

        Mensaje del estudiante:
        "{user_message}"

        Responde de forma clara, breve y pedagógica.
        """
        response = self.ai_client.generate_text(prompt)
        
        return response
    