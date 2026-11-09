"use server";

import { addEmail, getEmails } from "@/lib/api";

export async function addEmailAction(email: string) {
  return await addEmail(email);
}

export async function getEmailsAction() {
  return await getEmails();
}