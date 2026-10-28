import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { getAuthSession } from "@/lib/auth.functions";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const session = await getAuthSession().catch(() => null);
    if (!session) {
      throw redirect({ to: "/auth", search: { mode: "login", redirect: location.href } });
    }
    return { user: { id: session.userId, email: session.email, name: session.name } };
  },
  component: () => <Outlet />,
});
