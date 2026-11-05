"use server";

import * as z from "zod";
import {
  LoginFormSchema,
  SignupFormSchema,
  FormState,
} from "@/lib/definitions";

import { loginCall, signupCall, logoutCall } from "@/lib/api";

import { saveSession } from "@/lib/session";
import { deleteSession } from "@/lib/session";
import { redirect } from "next/navigation";

/**
 * Validate signup information and create a user account.
 *
 * @param state - Previous form state.
 * @param formData - Data submitted by the signup form.
 */
export async function signup(
  state: FormState,
  formData: FormData
): Promise<FormState> {

  // Validate form fields using Zod.
  const validatedFields = SignupFormSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  // Return field-specific errors if validation fails.
  if (!validatedFields.success) {
    return {
      errors: z.flattenError(validatedFields.error).fieldErrors,
    };
  }

  try {
    // Send validated signup data to FastAPI.
    const response = await signupCall(validatedFields.data);
    const data = await response.json();

    // Handle unsuccessful API responses.
    if (!response.ok) {
      return {
        message:
          typeof data.detail === "string"
            ? data.detail
            : "Signup failed.",
      };
    }

    // Account created successfully.
    return {
      message: "Signup successful",
    };

  } catch (error) {
    console.error("Signup failed:", error);

    return {
      message: "Unable to connect to the server.",
    };
  }
}

/**
 * Validate login credentials and request authentication.
 *
 * @param state - Previous form state.
 * @param formData - Data submitted by the login form.
 */
export async function login(
  state: FormState,
  formData: FormData
): Promise<FormState> {

  // Validate submitted credentials.
  const validatedFields = LoginFormSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return {
      errors: z.flattenError(validatedFields.error).fieldErrors,
    };
  }

  try {
    // Authenticate the user through FastAPI.
    const response = await loginCall(validatedFields.data);
    const data = await response.json();

    if (!response.ok) {
      return {
        message:
          typeof data.detail === "string"
            ? data.detail
            : "Invalid email or password.",
      };
    }

    // FastAPI must return a valid session token.
    if (typeof data.session_token !== "string") {
      return {
        message: "No session token received from the server.",
      };
    }

    // Store the session in an HTTP-only cookie.
    await saveSession(data.session_token);

    return {
      message: "Login successful",
    };

  } catch (error) {
    console.error("Login failed:", error);

    return {
      message: "Unable to connect to the server.",
    };
  }
}



export async function logout() {
  await logoutCall();
  await deleteSession();

  redirect("/login");
}