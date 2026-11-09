"use client";

import { useCallback, useEffect, useState } from "react";
import AddEmailModal from "@/components/AddEmailModal";
import { getEmailsAction } from "@/action/email";
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
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    void loadEmails();
  }, [loadEmails]);

  function handleClose() {
    setIsOpen(false);
    void loadEmails();
  }

  return (
    <>
      <div className="card">
        <h2>Email Accounts</h2>

        <div style={{ marginTop: "16px" }}>
          {isLoading ? (
            <p>Loading emails...</p>
          ) : error ? (
            <p role="alert">{error}</p>
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
                  <span style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span>✉</span>
                    <span>{account.email}</span>
                  </span>

                  <button
                    type="button"
                    className={styles.deleteButton}
                    aria-label={`Delete ${account.email}`}
                    title="Delete email"
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