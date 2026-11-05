"use server";

import { requireUser } from "@/lib/auth/server";
import { passwordSchema } from "@/lib/validation/auth";

export type PasswordActionState = { error: string | null; success: boolean };

export async function updatePassword(
  previousState: PasswordActionState,
  formData: FormData,
): Promise<PasswordActionState> {
  void previousState;
  const parsed = passwordSchema.safeParse(formData.get("password"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Choose a valid password.", success: false };

  const { supabase } = await requireUser();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) {
    console.error("Updating password failed:", error.message);
    return { error: "Your password could not be updated. Please try again.", success: false };
  }
  return { error: null, success: true };
}
