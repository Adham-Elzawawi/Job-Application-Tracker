"use server";

import { addEmail } from "@/lib/api";

export async function addEmailAction(email: string) {
  return await addEmail(email);
}