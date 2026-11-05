import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address.");
export const passwordSchema = z.string().min(8, "Use at least 8 characters.").max(72, "Use 72 characters or fewer.");

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, "Enter your password.") });

export type SignupInput = z.infer<typeof signupSchema>;
