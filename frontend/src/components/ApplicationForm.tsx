
"use client";

import Link from "next/link";
import { useActionState } from "react";

import { submitApplication } from "@/action/submitApp";
import DateAppliedInput from "@/components/DateAppliedInput";
import styles from "@/styles/AddApplication.module.css";

type ApplicationFormProps = {
  userId: string;
};

/**
 * Application form.
 *
 * Collects the application details and submits them
 * to the submitApplication Server Action.
 */
export default function ApplicationForm({
  userId,
}: ApplicationFormProps) {

  // Connect the form to the Server Action.
  const [state, formAction, pending] = useActionState(
    submitApplication,
    undefined
  );


  return (
    <form action={formAction} className={styles.form} noValidate>

      {/* Temporary user ID supplied by the page */}
      <input
        type="hidden"
        name="user_id"
        value={userId}
      />

      <div className={styles.formGrid}>

        {/* Company name */}
        <div className={styles.field}>
          <label htmlFor="company_name" className={styles.label}>
            Company Name <span className={styles.required}>*</span>
          </label>

          <input
            id="company_name"
            name="company_name"
            type="text"
            placeholder="e.g. Google"
            className={styles.input}
            required
          />

          {state?.errors?.company_name?.map((error, index) => (
            <p key={index} className={styles.error}>
              {error}
            </p>
          ))}
        </div>

        {/* Job position */}
        <div className={styles.field}>
          <label htmlFor="position" className={styles.label}>
            Job Position <span className={styles.required}>*</span>
          </label>

          <input
            id="position"
            name="position"
            type="text"
            placeholder="e.g. Software Engineer"
            className={styles.input}
            required
          />

          {state?.errors?.position?.map((error, index) => (
            <p key={index} className={styles.error}>
              {error}
            </p>
          ))}
        </div>

        {/* Application status */}
        <div className={styles.field}>
          <label htmlFor="status" className={styles.label}>
            Application Status <span className={styles.required}>*</span>
          </label>

          <select
            id="status"
            name="status"
            className={styles.select}
            defaultValue="applied"
          >
            <option value="applied">Applied</option>
            <option value="interview">Interview</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>

          <p className={styles.fieldHint}>
            Current stage of your application.
          </p>

          {state?.errors?.status?.map((error, index) => (
            <p key={index} className={styles.error}>
              {error}
            </p>
          ))}
        </div>

        {/* Application date */}
        <div className={styles.field}>
          <label htmlFor="applied_at" className={styles.label}>
            Date of status <span className={styles.required}>*</span>
          </label>

          <DateAppliedInput />

          {state?.errors?.applied_at?.map((error, index) => (
            <p key={index} className={styles.error}>
              {error}
            </p>
          ))}
        </div>
      </div>

      {/* API response */}
      {state?.message && (
        <p
          className={
            state.success
              ? styles.successMessage
              : styles.errorMessage
          }
          role="status"
          aria-live="polite"
        >
          {state.message}
        </p>
      )}

      {/* Form actions */}
      <div className={styles.actions}>
        <Link
          href="/dashboard"
          className={styles.cancelButton}
        >
          Cancel
        </Link>

        <button
          type="submit"
          className={styles.submitButton}
          disabled={pending}
        >
          {pending ? "Saving..." : "Save Application"}
          {!pending && <span>→</span>}
        </button>
      </div>
    </form>
  );
}
