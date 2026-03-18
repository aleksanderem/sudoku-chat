import { createFileRoute } from "@tanstack/react-router";
import { RegisterForm } from "@/components/auth/register-form";

export const Route = createFileRoute("/_app/register")({
  component: RegisterPage,
});

function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <RegisterForm />
    </div>
  );
}
