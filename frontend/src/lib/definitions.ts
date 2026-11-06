
import * as z from "zod";

export const SignupFormSchema = z.object({
  name: z
    .string()
    .min(2, { error: "Name must be at least 2 characters long." })
    .trim(),

  email: z.email({ error: "Please enter a valid email." }).trim(),

  password: z
    .string()
    .min(8, { error: "Be at least 8 characters long" })
    .regex(/[a-z]/, { error: "Contain at least one lowercase letter." })
    .regex(/[A-Z]/, { error: "Contain at least one uppercase letter." })
    .regex(/[0-9]/, { error: "Contain at least one number." })
    .regex(/[^a-zA-Z0-9]/, {
      error: "Contain at least one special character.",
    })
    .trim(),
});

export const LoginFormSchema = SignupFormSchema
  .omit({ name: true })
  .extend({
    password: z.string().min(1, {
      error: "Please enter your password.",
    }),
  });

export type FormState =
  | {
      errors?: {
        name?: string[];
        email?: string[];
        password?: string[];
      };
      message?: string;
    }
  | undefined;

export type ApplicationFormState =
  | {
      errors?: {
        company_name?: string[];
        position?: string[];
        status?: string[];
      };
      message?: string;
      success?: boolean;
    }
  | undefined;

export const ApplicationFormSchema = z.object({
  company_name: z
    .string()
    .trim()
    .min(1, { error: "Company name is required." }),

  position: z
    .string()
    .trim()
    .min(1, { error: "Position is required." }),

  status: z.enum(
    ["applied", "interview", "accepted", "rejected"],
    { error: "Invalid application status." }
  ),
});
