
export type ApplicationStatus =
  | "applied"
  | "interview"
  | "accepted"
  | "rejected";

export type Application = {
  id: string;
  company_name: string;
  position: string;
  status: ApplicationStatus;
  last_email_date: string | null;
  created_at: string;
  updated_at: string;
};

export const statusLabels: Record<ApplicationStatus, string> = {
  applied: "Applied",
  interview: "Interview",
  accepted: "Accepted",
  rejected: "Rejected",
};
