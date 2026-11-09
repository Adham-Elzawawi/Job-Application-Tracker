"use client";

import { useState } from "react";

import { addEmailAction } from "@/action/email";

import styles from "@/styles/AddEmailModal.module.css";

interface AddEmailModalProps {
  onClose: () => void;
}



export default function AddEmailModal({
  onClose,
}: AddEmailModalProps) {
    const [email, setEmail] = useState("");

    async function handleAddEmail() {
        try {
            await addEmailAction(email);
            onClose();
        } catch (error) {
            console.error("Failed to add email:", error);
        }
    }

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-email-title"
        onClick={(e) => e.stopPropagation()}
        
      >
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close"
        >
          x
        </button>

        <h2 id="add-email-title">Add Email Account</h2>

        <p className={styles.description}>
          Enter the email address you want to add.
        </p>

        <div className={styles.field}>
          <label htmlFor="email">Email Address</label>

          <input
            id="email"
            type="email"
            placeholder="example@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
         
            autoFocus
          />
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleAddEmail}

          >
            Add Email
          </button>
        </div>
      </div>
    </div>
  );
}