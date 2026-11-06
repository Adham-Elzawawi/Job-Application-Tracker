
"use client";

import { useState, useTransition, useEffect } from "react";
import { syncEmails } from "@/action/application";
import styles from "@/styles/AddApplication.module.css";

type Notification = {
  message: string;
  type: "success" | "error";
};

export default function ReadEmailsButton() {
  const [isPending, startTransition] = useTransition();
  const [notification, setNotification] = useState<Notification | null>(null);

  // Automatically dismiss notification after 5 seconds.
  useEffect(() => {
    if (!notification) return;

    const timeout = setTimeout(() => {
      setNotification(null);
    }, 5000);

    return () => clearTimeout(timeout);
  }, [notification]);

  function handleReadEmails() {
    setNotification(null);

    startTransition(async () => {
      try {
        const response = await syncEmails();

        setNotification({
          message: `${response.added} applications added, ${response.updated} updated.`,
          type: "success",
        });
      } catch (error) {
        console.error("Email synchronization failed:", error);

        setNotification({
          message: "Failed to synchronize emails. Please try again.",
          type: "error",
        });
      }
    });
  }

  return (
    <>
      <button
        type="button"
        className={`btn btn-primary ${styles.readEmailsButton}`}
        onClick={handleReadEmails}
        disabled={isPending}
      >
        {isPending ? "Syncing Emails..." : "Read Emails"}
      </button>

      {notification && (
        <div
          role={notification.type === "error" ? "alert" : "status"}
          className={`${styles.toast} ${
            notification.type === "success"
              ? styles.toastSuccess
              : styles.toastError
          }`}
        >
          <span>
            {notification.type === "success" ? "✓" : "✕"}
          </span>
          <span>{notification.message}</span>
        </div>
      )}
    </>
  );
}
