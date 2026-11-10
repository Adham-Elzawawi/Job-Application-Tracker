"use server";

import { redirect } from "next/navigation";

import { addEmail, getEmails, deleteEmail, startGmailConnection } from "@/lib/api";


export async function addEmailAction(email: string) {
  return await addEmail(email);
}

export async function getEmailsAction() {
  return await getEmails();
}

export async function deleteEmailAction(email: string) {
  return await deleteEmail(email);
}

export async function connectGmailAction() {
  const { connect_url } = await startGmailConnection();

  redirect(connect_url);
}