"use client";

import { useState } from "react";
import AddEmailModal from "@/components/AddEmailModal";

export default function EmailAccounts() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="card">
        <h2>Email Accounts</h2>

        <div
          style={{
            display: "flex",
            gap: "12px",
            marginTop: "12px",
          }}
        >
          <button
            className="btn btn-primary"
            onClick={() => setIsOpen(true)}
          >
            + Add Account
          </button>

          <button className="btn btn-secondary">
            Remove Account
          </button>
        </div>
      </div>

      {isOpen && (
        <AddEmailModal onClose={() => setIsOpen(false)} />
      )}
    </>
  );
}