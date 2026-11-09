import { logout } from "@/action/auth";
import EmailAccounts from "@/components/EmailAccounts";

export default function SettingsPage() {
  return (
    <div>
      <h1 className="page-title">Settings</h1>

      <EmailAccounts />

      <div className="card">
        <h2>Account</h2>

        <div style={{ marginTop: "12px" }}>
          <form action={logout}>
            <button type="submit" className="btn btn-secondary">
              Log Out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}