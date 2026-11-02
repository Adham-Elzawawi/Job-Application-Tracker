
export default function DashboardPage() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">JobTracker</div>

        <nav className="sidebar-nav">
          <a href="/" className="nav-link active">
            Dashboard
          </a>
          <a href="/applications" className="nav-link">
            Applications
          </a>
          <a href="/settings" className="nav-link">
            Settings
          </a>
        </nav>
      </aside>

      <main className="main-content">
        <header className="page-header">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-description">
              Track and manage your job applications.
            </p>
          </div>

          <button className="btn btn-primary">
            + Add Application
          </button>
        </header>

        <div className="stats-grid">
          <div className="card">
            <p className="stat-label">Total Applications</p>
            <h2 className="stat-value">0</h2>
          </div>

          <div className="card">
            <p className="stat-label">Interviews</p>
            <h2 className="stat-value">0</h2>
          </div>

          <div className="card">
            <p className="stat-label">Offers</p>
            <h2 className="stat-value">0</h2>
          </div>

          <div className="card">
            <p className="stat-label">Rejected</p>
            <h2 className="stat-value">0</h2>
          </div>
        </div>
      </main>
    </div>
  );
}
