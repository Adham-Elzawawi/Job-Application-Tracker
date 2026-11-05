
import { logout } from "@/action/auth";

export default function SettingsPage() {
  return (
    <div>
      <h1 className="page-title">Settings</h1>

      <div className="card">
        <h2>Email Accounts</h2>

        <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
          <button className="btn btn-primary">
            + Add Account
          </button>

          <button className="btn btn-secondary">
            Remove Account
          </button>
        </div>
      </div>

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
