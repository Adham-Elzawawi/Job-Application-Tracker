
import { getApplications } from "@/lib/api";
import Link from 'next/link';


export default async function DashboardPage() {
  const userId = "7fd6a729-985e-4660-ba3c-ea126e2c5b3d"; // Temporary user ID until session is implemented
  const response = await getApplications(userId);
  const applications = await response.json();
  
  const totalApplications = applications.length;
  const applicationsInProgress = applications.filter((app: any) => app.status != "accepted" && app.status != "rejected").length;
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

        <Link href="/addApplication" className="btn btn-primary">
          + Add Application
        </Link>
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
       <Link href="/login" className="btn btn-primary">
      Login Page
      </Link>
    </>

   
  );
}