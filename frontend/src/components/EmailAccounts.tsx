
"use client";

import { useCallback, useEffect, useState } from "react";
import AddEmailModal from "@/components/AddEmailModal";
import { getEmailsAction, deleteEmailAction } from "@/action/email";
import { Trash2 } from "lucide-react";

import styles from "@/styles/EmailAccounts.module.css";

interface EmailAccount {
  id: string;
  email: string;
}

export default function EmailAccounts() {
  const [isOpen, setIsOpen] = useState(false);
  const [emails, setEmails] = useState<EmailAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingEmail, setDeletingEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch emails from the backend
  const loadEmails = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getEmailsAction();
      setEmails(response.emails);
    } catch (error) {
      console.error("Failed to fetch emails:", error);
      setError("Failed to load email accounts.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch emails when the component mounts
  useEffect(() => {
    void loadEmails();
  }, [loadEmails]);

  // Close modal and refresh emails after adding an account
  function handleClose() {
    setIsOpen(false);
    void loadEmails();
  }

  // Delete email and update the UI without refreshing
  async function handleDeleteEmail(email: string) {
    setDeletingEmail(email);
    setError(null);

    try {
      await deleteEmailAction(email);

      // Remove the deleted email from React state
      setEmails((prev) =>
        prev.filter((account) => account.email !== email)
      );
    } catch (error) {
      console.error("Failed to delete email:", error);
      setError("Failed to delete email. Please try again.");
    } finally {
      setDeletingEmail(null);
    }
  }

  return (
    <>
      <div className="card">
        <h2>Email Accounts</h2>

        <div style={{ marginTop: "16px" }}>
          {error && (
            <p
              role="alert"
              style={{
                color: "#ef4444",
                marginBottom: "12px",
              }}
            >
              {error}
            </p>
          )}

          {isLoading ? (
            <p>Loading emails...</p>
          ) : emails.length === 0 ? (
            <p>No email accounts added yet.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {emails.map((account) => (
                <li
                  key={account.id}
                  style={{
                    padding: "12px",
                    borderBottom: "1px solid #ddd",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      minWidth: 0,
                    }}
                  >
                    <span>✉</span>
                    <span style={{ overflowWrap: "anywhere" }}>
                      {account.email}
                    </span>
                  </span>

                  <button
                    type="button"
                    className={styles.deleteButton}
                    aria-label={`Delete ${account.email}`}
                    title="Delete email"
                    onClick={() => handleDeleteEmail(account.email)}
                    disabled={deletingEmail === account.email}
                  >
                    <Trash2 size={18} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={{ marginTop: "16px" }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsOpen(true)}
          >
            + Add Account
          </button>
        </div>
      </div>

      {isOpen && (
        <AddEmailModal onClose={handleClose} />
      )}
    </>
  );
}
