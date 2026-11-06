
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getApplications, getCurrentUser } from "@/lib/api";
import styles from "@/styles/Applications.module.css";

type Application = {
  id: string;
  company_name: string;
  position: string;
  status: "applied" | "interview" | "accepted" | "rejected";
  applied_at: string;
};

const statusLabels = {
  applied: "Applied",
  interview: "Interview",
  accepted: "Accepted",
  rejected: "Rejected",
};

export default function ApplicationsPage() {
  return (
    <div>
      <header className="page-header">
        <div>
          <h1 className="page-title">Applications</h1>
          <p className="page-description">
            Manage and track your job applications.
          </p>
        </div>

        <Link href="/addApplication" className="btn btn-primary">
          + Add Application
        </Link>
      </header>

      <Suspense fallback={<div className="card">Loading applications...</div>}>
        <ApplicationsList />
      </Suspense>
    </div>
  );
}

async function ApplicationsList() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const applications = (await getApplications()) as Application[];

  applications.sort((a, b) => {
    let a_date = new Date(a.applied_at);
    let b_date = new Date(b.applied_at);

    return a_date <= b_date ? 1 : -1;
  })

  return (
    <div className="card">
      {applications.length === 0 ? (
        <div className={styles.emptyState}>
          <h2>No applications yet</h2>
          <p>Start tracking your job search by adding an application.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className={`table ${styles.applicationsTable}`}>
            <thead>
              <tr>
                <th>Company</th>
                <th>Position</th>
                <th>Status</th>
                <th>Date Applied</th>
              </tr>
            </thead>

            <tbody>
              {applications.map((app) => (
                <tr key={app.id} className={styles.applicationRow}>
                  <td className={styles.companyName}>
                    {app.company_name}
                  </td>

                  <td>{app.position}</td>

                  <td>
                    <span
                      className={`status-badge ${
                        app.status === "accepted"
                          ? styles.accepted
                          : `status-${app.status}`
                      }`}
                    >
                      {statusLabels[app.status]}
                    </span>
                  </td>

                  <td className={styles.date}>
                    {new Date(app.applied_at).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      timeZone: "UTC",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
