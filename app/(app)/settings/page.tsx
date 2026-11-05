"use client";

import { useActionState, useEffect, useRef } from "react";
import { updatePassword, type PasswordActionState } from "./actions";

const initialState: PasswordActionState = { error: null, success: false };

export default function SettingsPage() {
  const [state, formAction, pending] = useActionState(updatePassword, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <section className="card mx-auto max-w-xl space-y-4 p-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Settings</h1>
        <p className="muted mt-2 text-sm">Update your account password.</p>
      </div>
      <form ref={formRef} action={formAction} className="space-y-4">
        <label className="block text-sm font-semibold">
          New password
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={72}
            className="input mt-1 font-normal"
          />
        </label>
        {state.error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
        {state.success && <p role="status" className="text-sm text-mint-700 dark:text-mint">Password updated.</p>}
        <button className="btn-primary" disabled={pending}>{pending ? "Updating..." : "Update password"}</button>
      </form>
    </section>
  );
}
