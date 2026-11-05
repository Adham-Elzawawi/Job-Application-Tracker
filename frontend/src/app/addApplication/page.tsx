
import Link from "next/link";
import styles from "@/styles/AddApplication.module.css";
import ApplicationForm from "@/components/ApplicationForm";
import { getCurrentUser } from "@/lib/api";
import { redirect } from "next/navigation";

export default async function addApplication() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const userId = user.id;

  return (
    <div className={styles.page}>
      {/* Page header */}
        <header className={styles.header}>
            <div>
            <Link href="/dashboard" className={styles.backLink}>
                ← Back to Dashboard
            </Link>

            <h1 className={styles.title}>Add Application</h1>
            <p className={styles.description}>
                Add applications manually or import them from your emails.
            </p>
            </div>
        </header>

      
        {/* Email import card */}
        <div className={styles.formCard}>
        <div className={`${styles.cardHeader} ${styles.emailHeader}`}>
            <div className={styles.cardIcon}>✉</div>

            <div className={styles.emailText}>
            <h2 className={styles.cardTitle}>
                Import from Email
            </h2>
            <p className={styles.cardDescription}>
                Scan your connected email accounts to automatically
                identify and import job applications.
            </p>
            </div>

            <button
            type="button"
            className={`btn btn-primary ${styles.readEmailsButton}`}
            >
            Read Emails
            </button>
        </div>
        </div>


        {/* Manual application card */}
        <div className={styles.formCard}>
            <div className={styles.cardHeader}>
            <div className={styles.cardIcon}>↗</div>
            <div>
                <h2 className={styles.cardTitle}>
                Application Details
                </h2>
                <p className={styles.cardDescription}>
                Fill in the information below to track this application.
                </p>
            </div>
            </div>

        <ApplicationForm userId={userId} />
      </div>
    </div>
  );
}
