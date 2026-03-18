import { createFileRoute } from "@tanstack/react-router";
import { LoginForm } from "@/components/auth/login-form";

export const Route = createFileRoute("/_app/login")({
  component: LoginPage,
});

function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <LoginForm />
    </div>
  );
}
