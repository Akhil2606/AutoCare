
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
from app.models.user import User
from app.routers import auth

import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

Base.metadata.create_all(bind=engine)

app = FastAPI(title="AutoCare Backend API", version="1.0.0")

STATIC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "static"))

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/login", include_in_schema=False)
def login_page():
    return FileResponse(os.path.join(STATIC_DIR, "login.html"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://saiakshay12.github.io",
        "http://localhost:5500",
        "http://127.0.0.1:5500"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(auth.router)

@app.get("/")
def home():
    return {"message": "AutoCare Backend is running successfully"}

@app.get("/health")
def health():
    return {"status": "healthy"}
