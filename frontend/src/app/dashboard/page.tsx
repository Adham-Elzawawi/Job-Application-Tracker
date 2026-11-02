export default function DashboardPage() {
  return (
    <>
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
          <h2 className="stat-value">42</h2>
        </div>
        <div className="card">
          <p className="stat-label">Applications in Progress</p>
          <h2 className="stat-value">15</h2>
        </div>
        <div className="card">
          <p className="stat-label">Applications Rejected</p>
          <h2 className="stat-value">10</h2>
        </div>
      </div>
    </>
  );
}