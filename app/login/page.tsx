import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Log in - MedSprint" };

export default function Page() {
  return (
    <Suspense>
      <AuthForm mode="login" />
    </Suspense>
  );
}
