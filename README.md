# Job Application Tracker

A small full-stack project to keep track of my job applications. It uses Next.js for the frontend, FastAPI for the backend, PostgreSQL for the database, and a local Qwen model through Ollama to read Gmail application emails.

## Running the project

I normally use **three terminals**: one for the backend, one for the frontend, and one to check Docker/Ollama if needed.

### 1. Start PostgreSQL

From the folder containing `docker-compose.yml`:

```bash
docker compose up -d
```

To check that the database container is running:

```bash
docker ps
```

### 2. Start the backend

From the `backend` folder:

```bash
source .venv/bin/activate
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

The API runs at **http://localhost:8000**. API documentation is at **http://localhost:8000/docs**.

### 3. Start Ollama

Ollama may already be running on my Mac. Check with:

```bash
curl http://localhost:11434/api/tags
```

If it isn't running, start it in another terminal:

```bash
ollama serve
```

The model is loaded automatically when the backend calls it. To download it for the first time:

```bash
ollama pull qwen3:4b-instruct
```

Useful commands:

```bash
ollama list                   # Installed models
ollama ps                     # Models currently loaded
ollama stop qwen3:4b-instruct # Unload the model
```

### 4. Start the frontend

From the folder containing `package.json`:

```bash
npm run dev
```

Open **http://localhost:3000**.

## Database commands

When I change SQLAlchemy models, I create an Alembic migration, check the generated file, and apply it:

```bash
cd backend
alembic revision --autogenerate -m "describe change"
alembic upgrade head
```

To open PostgreSQL inside Docker:

```bash
docker ps
docker exec -it <container_name> psql -U <db_user> -d <db_name>
```

Some useful commands inside `psql`:

```sql
\dt
SELECT * FROM users;
SELECT * FROM applications;
\q
```

## Stopping everything

Stop the frontend and backend with **Ctrl+C** in their terminals.

To stop the Docker containers (without deleting the database volume):

```bash
docker compose down
```

## Notes

- The backend needs its `.env` values and Gmail OAuth `credentials.json` configured locally.
- Don't commit `.env`, OAuth credentials, or user tokens to Git.
- Gmail synchronization uses the Gmail message date to decide the order of application updates.
- If `ollama serve` says **address already in use**, Ollama is probably already running.
