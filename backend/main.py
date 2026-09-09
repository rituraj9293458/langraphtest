from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import time
from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder


# --------------------------------------------------
# FastAPI application
# --------------------------------------------------

app = FastAPI()


# --------------------------------------------------
# Allow React frontend to communicate with FastAPI
# --------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# Request structure
# --------------------------------------------------

class ChatRequest(BaseModel):
    message: str


# --------------------------------------------------
# Ollama LLM
# --------------------------------------------------

llm = ChatOllama(
    model="qwen2.5:3b",
    temperature=0
)


# --------------------------------------------------
# Prompt
# --------------------------------------------------

prompt = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are a helpful AI assistant."
    ),
    MessagesPlaceholder(
        variable_name="messages"
    )
])


# --------------------------------------------------
# LangChain chain
# --------------------------------------------------

chain = prompt | llm


# --------------------------------------------------
# Simple GET route for testing
# --------------------------------------------------

@app.get("/")
def home():
    return {
        "message": "Backend is running"
    }


# --------------------------------------------------
# Chat endpoint with streaming
# --------------------------------------------------

@app.post("/chat")
async def chat(request: ChatRequest):

    async def generate():

        async for chunk in chain.astream({
            "messages": [
                ("human", request.message)
            ]
        }):
            time.sleep(0.1);

            if chunk.content:
                yield chunk.content


    return StreamingResponse(
        generate(),
        media_type="text/plain"
    )