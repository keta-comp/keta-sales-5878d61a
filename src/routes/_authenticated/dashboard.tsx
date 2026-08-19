import { createFileRoute, Outlet } from "@tanstack/react-router";

import { DashboardShell } from "@/components/app/DashboardShell";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  const { user } = Route.useRouteContext();
  return (
    <DashboardShell email={user?.email ?? undefined}>
      <Outlet />
    </DashboardShell>
  );
}