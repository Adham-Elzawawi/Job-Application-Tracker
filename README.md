# Job Application Tracker

A full-stack web application for managing job applications, built with **Next.js**, **FastAPI**, **SQLAlchemy**, and **PostgreSQL**.

The project is under active development. The current development workflow runs the Next.js frontend and FastAPI backend on the host computer, while PostgreSQL 17 runs in Docker. Planned features include Gmail synchronization, local LLM-assisted email analysis, application status tracking, and Excel export; these features should not be assumed to be available yet.

## Prerequisites

Install the following before getting started:

- **Git** to clone the repository.
- **Docker Desktop** (or Docker Engine with Docker Compose) to run PostgreSQL. Make sure Docker is running.
- **Python 3** and `pip` to run the FastAPI backend. Use a version compatible with `backend/requirements.txt`.
- **Node.js and npm** to run the Next.js frontend. Use a Node.js version compatible with the project's Next.js version.

The commands below use macOS/Linux shells. Windows PowerShell equivalents are provided for activating the Python virtual environment.

## First-time setup

### 1. Clone the project

```bash
git clone <repository-url>
cd "Job Application Tracker"
```

Replace `<repository-url>` with the repository's actual Git URL. Run subsequent commands from the **project root** (the directory containing `compose.yaml`) unless a step specifies otherwise.

### 2. Configure the backend environment

Create a file named **`backend/.env`** containing:

```dotenv
DATABASE_URL=postgresql+psycopg://tracker:pass_123456@localhost:5433/job_tracker
```

This connection string matches the local development settings in `compose.yaml`:

| Setting | Value |
| --- | --- |
| Database host | `localhost` |
| Host port | `5433` |
| Database name | `job_tracker` |
| PostgreSQL user | `tracker` |
| PostgreSQL password | `pass_123456` |

These are **development-only credentials**. Do not reuse them in production, and do not commit `.env` files to Git. If the Compose configuration changes, update `DATABASE_URL` accordingly.

### 3. Install backend dependencies

From the project root:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ..
```

On **Windows PowerShell**, activate the environment from `backend/` with:

```powershell
.venv\Scripts\Activate.ps1
```

The backend uses SQLAlchemy with the PostgreSQL `psycopg` driver. Python packages are managed through `backend/requirements.txt`.

### 4. Install frontend dependencies

From the project root:

```bash
cd frontend
npm install
cd ..
```

### 5. Start PostgreSQL

From the **project root**:

```bash
docker compose up -d db
```

Check its status:

```bash
docker compose ps
```

The Compose configuration maps port **5433 on your computer** to port **5432 inside the PostgreSQL container**.

### 6. Apply database migrations

From the project root:

```bash
cd backend
source .venv/bin/activate
alembic upgrade head
cd ..
```

If using Windows PowerShell, activate the virtual environment using the Windows command shown earlier.

Alembic creates or updates the database schema. Run this during initial setup and whenever new migrations are introduced. **It is not necessary for every startup.** A new database will not automatically contain sample application records.

## Start the application

Open **two separate terminals** for the backend and frontend. PostgreSQL can stay running in the background.

### Terminal 1 — FastAPI backend

From the **project root**:

```bash
cd backend
source .venv/bin/activate
python -m uvicorn app.main:app --reload
```

- API base URL: <http://localhost:8000>
- Interactive API documentation: <http://localhost:8000/docs>

Start Uvicorn from `backend/`, not `backend/app/`, so Python can resolve the `app` package imports.

### Terminal 2 — Next.js frontend

From the **project root**:

```bash
cd frontend
npm run dev
```

- Frontend: <http://localhost:3000>

If port 3000 is unavailable, use the local URL shown in the Next.js terminal.

### Startup checklist

1. Docker/PostgreSQL is running: `docker compose ps`.
2. FastAPI is available at <http://localhost:8000/docs>.
3. Next.js is available at <http://localhost:3000> (or the port printed in the terminal).

## Stop the application

1. Press **Ctrl+C** in the **Next.js** terminal.
2. Press **Ctrl+C** in the **FastAPI** terminal. Run `deactivate` if you want to exit the Python virtual environment.
3. From the **project root**, stop PostgreSQL:

   ```bash
   docker compose stop db
   ```

Stopping PostgreSQL this way **preserves all database data** in the named Docker volume.

> **Warning:** Do not run `docker compose down -v` unless you deliberately intend to remove the database volume and lose its stored data.

## Start again after initial setup

On later development sessions, you do **not** need to reinstall dependencies, recreate the virtual environment, or repeat migrations unless the project has changed.

1. From the project root, run `docker compose up -d db`.
2. From `backend/`, activate `.venv` and run `python -m uvicorn app.main:app --reload`.
3. From `frontend/`, run `npm run dev`.

## Useful database commands

Run these from the **project root**:

| Action | Command |
| --- | --- |
| Start PostgreSQL in background | `docker compose up -d db` |
| View container status | `docker compose ps` |
| Read PostgreSQL logs | `docker compose logs db` |
| Stop PostgreSQL (retain data) | `docker compose stop db` |
| Remove Compose containers/networks (retain named volumes) | `docker compose down` |

PostgreSQL can also be browsed with a VS Code PostgreSQL extension using `localhost`, port `5433`, database `job_tracker`, and the development credentials above.

## Project structure

```text
Job Application Tracker/
├── compose.yaml                  # PostgreSQL service and persistent volume
├── backend/
│   ├── .env                      # Local environment variables (not committed)
│   ├── requirements.txt          # Python dependencies
│   ├── alembic.ini               # Alembic configuration
│   ├── alembic/                  # Database migration scripts
│   └── app/
│       ├── __init__.py
│       ├── main.py               # FastAPI application and routes
│       ├── database.py           # SQLAlchemy engine, sessions, settings
│       └── models.py             # ORM models
└── frontend/
    └── src/
        ├── app/                  # Next.js App Router pages and layouts
        ├── components/           # Shared React components
        └── styles/               # CSS styles
```

Generated directories such as `.venv/` and `node_modules/` are created locally during setup and should not be committed to source control.

## Troubleshooting

**`ImportError: attempted relative import with no known parent package`**  
Start the backend from `backend/` using `python -m uvicorn app.main:app --reload`. Do not execute `app/main.py` directly.

**PostgreSQL connection refused**  
Ensure Docker is running and check `docker compose ps`. The database is exposed on **port 5433**, not 5432, when connecting from the host computer. Verify that `backend/.env` matches `compose.yaml`.

**The API returns an empty list of applications**  
A new database contains tables after migrations but no sample records. Check that the expected rows exist in `job_tracker` and that the application is querying the correct user ID.

**The frontend cannot fetch data from FastAPI**  
Check that the backend is running and that the requested endpoint URL is correct. Browser-side requests from the Next.js origin may also require an appropriate CORS configuration in FastAPI.

**Changes to the ORM model are not visible in PostgreSQL**  
Updating `models.py` does not automatically change existing tables. Create/review an Alembic migration and apply it using `alembic upgrade head`.

## Development notes

- **FastAPI** exposes HTTP endpoints and handles application logic.
- **SQLAlchemy** maps Python models to database tables and performs queries.
- **Alembic** tracks and applies schema changes.
- **Next.js** renders the user interface and communicates with FastAPI.
- **PostgreSQL** stores users and job applications persistently.

Gmail integration, Ollama/Qwen processing, and Excel export are planned components and are not required to run the current development environment.
