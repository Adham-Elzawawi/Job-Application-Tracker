
"use server";

import * as z from "zod";

import {
  ApplicationFormSchema,
  ApplicationFormState,
} from "@/lib/definitions";

import { createApplication, getCurrentUser } from "@/lib/api";
import { updateTag } from "next/cache";

export async function submitApplication(
  state: ApplicationFormState,
  formData: FormData
): Promise<ApplicationFormState> {

  const validatedFields = ApplicationFormSchema.safeParse({
    company_name: formData.get("company_name"),
    position: formData.get("position"),
    status: formData.get("status"),
  });

  if (!validatedFields.success) {
    return {
      errors: z.flattenError(validatedFields.error).fieldErrors,
      success: false,
    };
  }

  try {
    // Get the authenticated user
    const user = await getCurrentUser();

    if (!user) {
      return {
        message: "Not authenticated.",
        success: false,
      };
    }

    // Create the application
    const response = await createApplication(validatedFields.data);

    const data = await response.json();

    if (!response.ok) {
      return {
        message:
          typeof data.detail === "string"
            ? data.detail
            : "Application submission failed.",
        success: false,
      };
    }

    // Invalidate cache for the authenticated user
    updateTag(`applications:${user.id}`);

    return {
      message: "Application submitted successfully",
      success: true,
    };

  } catch (error) {
    console.error("Application submission failed:", error);

    return {
      message: "Unable to connect to the server.",
      success: false,
    };
  }
}
