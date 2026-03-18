import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/_auth")({
  component: AuthLayout,
});

function AuthLayout() {
  return <Outlet />;
}
