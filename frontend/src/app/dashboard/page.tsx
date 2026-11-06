
import { getApplications } from "@/lib/api";
import { getCurrentUser } from "@/lib/api";
import { redirect } from "next/navigation";
import Link from 'next/link';


export default async function DashboardPage() {
  const user = await getCurrentUser();
  
  if (!user) {return (redirect("/login"));}

  const userId = user.id;
  
  const applications = await getApplications();
  
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
    </>

   
  );
}