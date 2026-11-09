
import "server-only";

import {
  LoginFormSchema,
  SignupFormSchema,
  ApplicationFormSchema,
} from "@/lib/definitions";

import { getSession } from "@/lib/session";
import type { z } from "zod";

type LoginData = z.infer<typeof LoginFormSchema>;
type SignupData = z.infer<typeof SignupFormSchema>;
type ApplicationData = z.infer<typeof ApplicationFormSchema>;

const API_URL = "http://localhost:8000";

/**
 * Retrieve applications belonging to the authenticated user.
 */
export async function getApplications() {
  const sessionToken = await getSession();

  if (!sessionToken) {
    return null;
  }

  const response = await fetch(`${API_URL}/applications/me`, {
    headers: {
      Authorization: `Bearer ${sessionToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch applications");
  }

  return response.json();
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
 * Revoke the current session in FastAPI.
 */
export async function logoutCall() {
  const sessionToken = await getSession();

  if (!sessionToken) {
    return;
  }

  const response = await fetch(`${API_URL}/logout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to revoke session");
  }
}

/**
 * Create an application for the authenticated user.
 */
export async function createApplication(data: ApplicationData) {
  const sessionToken = await getSession();

  if (!sessionToken) {
    throw new Error("Not authenticated");
  }

  return fetch(`${API_URL}/sendApplication`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionToken}`,
    },
    body: JSON.stringify(data),
    cache: "no-store",
  });
}

/**
 * Retrieve the currently authenticated user.
 */
export async function getCurrentUser() {
  const sessionToken = await getSession();

  if (!sessionToken) {
    return null;
  }

  const response = await fetch(`${API_URL}/users/me`, {
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


export async function readEmail() {
  const sessionToken = await getSession();

  if (!sessionToken) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${API_URL}/gmail/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to synchronize Gmail applications");
  }

  return response.json() as Promise<{
    message: string;
    added: number;
    updated: number;
  }>;
}

export async function addEmail(email: string) {
  const sessionToken = await getSession();

  if (!sessionToken) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${API_URL}/email/addEmail`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: email,
    }),
  });

  if (!response.ok) {
    const error = await response.text();

    throw new Error(
      `Failed to add email (${response.status}): ${error}`
    );
  }

  return response.json();
}

export async function getEmails() {
  const sessionToken = await getSession();

  if (!sessionToken) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${API_URL}/email/getEmails`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${sessionToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch emails");
  }

  return response.json() as Promise<{
    emails: {
      id: string;
      email: string;
    }[];
  }>;
}