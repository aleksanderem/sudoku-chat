import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { Toaster } from "sonner";
import type { RouterContext } from "@/router";

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
});

function RootLayout() {
  return (
    <>
      <Helmet>
        <title>Sudoku</title>
      </Helmet>
      <Outlet />
      <Toaster position="bottom-right" />
    </>
  );
}
