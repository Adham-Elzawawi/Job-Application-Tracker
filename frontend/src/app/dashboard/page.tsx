import { getApplications } from "@/lib/api";

export default async function DashboardPage() {
  const userId = "83403f75-fef7-4201-b66e-3266fd863f91"; // Replace with actual user ID retrieval logic
  const response = await getApplications(userId);
  const applications = await response.json();
  
  const totalApplications = applications.length;
  const applicationsInProgress = applications.filter((app: any) => app.status === "applied").length;
  const applicationsRejected = applications.filter((app: any) => app.status === "rejected").length;
  const applicationsAccepted = applications.filter((app: any) => app.status === "accepted").length;
  
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
          <h2 className="stat-value">{totalApplications}</h2>
        </div>
        <div className="card">
          <p className="stat-label">Applications in Progress</p>
          <h2 className="stat-value">{applicationsInProgress}</h2>
        </div>
        <div className="card">
          <p className="stat-label">Applications Rejected</p>
          <h2 className="stat-value">{applicationsRejected}</h2>
        </div>
        <div className="card">
          <p className="stat-label">Applications Accepted</p>
          <h2 className="stat-value">{applicationsAccepted}</h2>
        </div>
      </div>
    </>
  );
}