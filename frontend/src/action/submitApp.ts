
"use server";

import * as z from "zod";

import {
  ApplicationFormSchema,
  ApplicationFormState,
} from "@/lib/definitions";

import { createApplication } from "@/lib/api";
import { updateTag } from "next/cache";

/**
 * Validate application data and submit it to FastAPI.
 *
 * @param state - Previous form state.
 * @param formData - Data collected from the application form.
 * @returns Validation errors or the API submission result.
 */
export async function submitApplication(
  state: ApplicationFormState,
  formData: FormData
): Promise<ApplicationFormState> {

    // 1. Validate the submitted fields with Zod.
    const validatedFields = ApplicationFormSchema.safeParse({
    user_id: formData.get("user_id"),
    company_name: formData.get("company_name"),
    position: formData.get("position"),
    status: formData.get("status"),
    applied_at: formData.get("applied_at"),
    });
    console.log("Validated fields:", validatedFields);

    // 2. Return field-specific validation errors.
    if (!validatedFields.success) {
    return {
        errors: z.flattenError(validatedFields.error).fieldErrors,
        success: false,
    };
    }

    try {
    // 3. Send validated data to FastAPI.
    const response = await createApplication(validatedFields.data);

    // 4. Read the API response.
    const data = await response.json();

    // 5. Handle unsuccessful responses.
    if (!response.ok) {
        return {
        message:
            typeof data.detail === "string"
            ? data.detail
            : "Application submission failed.",
        success: false,
        };
    }

    updateTag(`applications:${validatedFields.data.user_id}`);

    // 6. Application successfully saved.
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
