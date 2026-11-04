
import { LoginFormSchema, SignupFormSchema, ApplicationFormSchema} from "@/lib/definitions";
import { getSession } from "@/lib/session";

import type { z } from "zod";

// Infer request types from the existing Zod schemas.
type LoginData = z.infer<typeof LoginFormSchema>;
type SignupData = z.infer<typeof SignupFormSchema>;
type ApplicationData = z.infer<typeof ApplicationFormSchema>;

const API_URL = "http://localhost:8000";

/**
 * Retrieve all applications belonging to a user.
 */
export async function getApplications(userId: string) {
  return fetch(`${API_URL}/applications/${userId}`, {
    cache: "no-store",
  });
}

/**
 * Send login credentials to FastAPI.
 */
export async function loginCall(data: LoginData) {
  return fetch(`${API_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}

/**
 * Send signup information to FastAPI.
 */
export async function signupCall(data: SignupData) {
  return fetch(`${API_URL}/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}

/**
 * Send application information to FastAPI.
 */
export async function createApplication(data: ApplicationData) {
  return fetch(`${API_URL}/sendApplication`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}

export async function getCurrentUser() {
  const sessionToken = await getSession();

  if (!sessionToken) {
    return null;
  }

  const response = await fetch("http://localhost:8000/users/me", {
    headers: {
      Authorization: `Bearer ${sessionToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return response.json() as Promise<{
    id: string;
    name: string;
    email: string;
  }>;
}