"use server";

import { addEmail, getEmails, deleteEmail } from "@/lib/api";


export async function addEmailAction(email: string) {
  return await addEmail(email);
}

export async function getEmailsAction() {
  return await getEmails();
}

export async function deleteEmailAction(email: string) {
  return await deleteEmail(email);
}