
from fastapi import FastAPI

from .routers import applications, auth, gmail, users

app = FastAPI()

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(applications.router)
app.include_router(gmail.router)


@app.get("/")
def read_root():
    return {"message": "Hello, World!"}
