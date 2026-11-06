
"use client";

import { useState, useTransition } from "react";
import { syncEmails } from "@/action/application";
import styles from "@/styles/AddApplication.module.css";

export default function ReadEmailsButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  function handleReadEmails() {
    setResult(null);

    startTransition(async () => {
      try {
        const response = await syncEmails();

        setResult(
          `Successfully added ${response.added} applications and updated ${response.updated} applications.`
        );
      } catch (error) {
        console.error("Email synchronization failed:", error);
        setResult("Failed to synchronize emails. Please try again.");
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        className={`btn btn-primary ${styles.readEmailsButton}`}
        onClick={handleReadEmails}
        disabled={isPending}
      >
        {isPending ? "Syncing Emails..." : "Read Emails"}
      </button>

      {result && <p role="status">{result}</p>}
    </div>
  );
}
