"use server";

import { readEmail } from "@/lib/api";
import { revalidatePath } from "next/cache";

export async function syncEmails(selectedEmails: string[]) {
  const result = await readEmail(selectedEmails);

  revalidatePath("/dashboard");
  revalidatePath("/applications");

  return result;
}