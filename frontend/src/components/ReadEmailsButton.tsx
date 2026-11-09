
"use client";

import { useState, useTransition, useEffect } from "react";
import { syncEmails } from "@/action/application";
import { getEmailsAction } from "@/action/email";
import { X } from "lucide-react";

import styles from "@/styles/AddApplication.module.css";
import modalStyles from "@/styles/ReadEmailsModal.module.css";

interface EmailAccount {
  id: string;
  email: string;
}

type Notification = {
  message: string;
  type: "success" | "error";
};

export default function ReadEmailsButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [emails, setEmails] = useState<EmailAccount[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [notification, setNotification] =
    useState<Notification | null>(null);

  // Dismiss notifications after 5 seconds
  useEffect(() => {
    if (!notification) return;

    const timeout = setTimeout(() => {
      setNotification(null);
    }, 5000);

    return () => clearTimeout(timeout);
  }, [notification]);

  // Fetch email accounts when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let active = true;

    async function loadEmails() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await getEmailsAction();

        if (active) {
          setEmails(response.emails);
          setSelectedEmails(response.emails.map((account) => account.email));
        }
      } catch (err) {
        console.error("Failed to fetch emails:", err);

        if (active) {
          setError("Failed to load email accounts.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadEmails();

    return () => {
      active = false;
    };
  }, [isOpen]);

  function openModal() {
    setSelectedEmails([]);
    setEmails([]);
    setNotification(null);
    setError(null);
    setIsOpen(true);
  }

  function closeModal() {
    if (!isPending) {
      setIsOpen(false);
    }
  }

  function toggleEmail(email: string) {
    setSelectedEmails((prev) =>
      prev.includes(email)
        ? prev.filter((item) => item !== email)
        : [...prev, email]
    );
  }

  function handleReadEmails() {
    if (selectedEmails.length === 0 || isPending) return;

    setError(null);

    startTransition(async () => {
      try {
        {/* TODO: Pass the emails */}
        const response = await syncEmails();

        setIsOpen(false);

        setNotification({
          message: `${response.added} applications added, ${response.updated} updated.`,
          type: "success",
        });
      } catch (err) {
        console.error("Email synchronization failed:", err);

        setError(
          "Failed to synchronize emails. Please try again."
        );
      }
    });
  }

  return (
    <>
      <button
        type="button"
        className={`btn btn-primary ${styles.readEmailsButton}`}
        onClick={openModal}
        disabled={isPending}
      >
        {isPending ? "Syncing Emails..." : "Read Emails"}
      </button>

      {isOpen && (
        <div
          className={modalStyles.overlay}
          onClick={closeModal}
        >
          <div
            className={modalStyles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="read-emails-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={modalStyles.header}>
              <h2 id="read-emails-title">
                Select Email Accounts
              </h2>

              <button
                type="button"
                className={modalStyles.closeButton}
                onClick={closeModal}
                disabled={isPending}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <p className={modalStyles.description}>
              Choose which email accounts you want to
              synchronize.
            </p>

            {error && (
              <p className={modalStyles.error} role="alert">
                {error}
              </p>
            )}

            {isLoading ? (
              <p>Loading email accounts...</p>
            ) : emails.length === 0 ? (
              <p>No email accounts available.</p>
            ) : (
              <div className={modalStyles.emailList}>
                {emails.map((account) => (
                  <label
                    key={account.id}
                    className={modalStyles.emailRow}
                  >
                    <input
                      type="checkbox"
                      checked={selectedEmails.includes(
                        account.email
                      )}
                      onChange={() =>
                        toggleEmail(account.email)
                      }
                      disabled={isPending}
                    />

                    <span>{account.email}</span>
                  </label>
                ))}
              </div>
            )}

            <div className={modalStyles.actions}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={closeModal}
                disabled={isPending}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleReadEmails}
                disabled={
                  isPending ||
                  isLoading ||
                  selectedEmails.length === 0
                }
              >
                {isPending
                  ? "Syncing..."
                  : `Read Selected (${selectedEmails.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {notification && (
        <div
          role={
            notification.type === "error"
              ? "alert"
              : "status"
          }
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
