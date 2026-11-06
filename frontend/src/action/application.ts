"use server";

import { readEmail } from "@/lib/api";
import { revalidatePath } from "next/cache";

export async function syncEmails() {
  const result = await readEmail();

  revalidatePath("/dashboard");
  revalidatePath("/applications");

  return result;
}