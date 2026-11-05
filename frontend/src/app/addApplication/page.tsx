
import Link from "next/link";
import styles from "@/styles/AddApplication.module.css";
import ApplicationForm from "@/components/ApplicationForm";
import { getCurrentUser } from "@/lib/api";

import { redirect } from "next/navigation";
/**
 * Add Application Page
 *
 * Form for recording a new job application.
 * Submission functionality will be implemented separately.
 */
export default async function addApplication() {
    
    const user = await getCurrentUser();
    
    if (!user) {return (redirect("/login"));}
    
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
            Enter the details of a new job application.
            </p>
        </div>
        </header>

        {/* Application form */}
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

        {/* Send the user's ID */}
        <ApplicationForm userId={userId} />
        </div>
    </div>
    );
}
