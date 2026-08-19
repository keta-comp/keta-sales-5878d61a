import { useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Boxes,
  LayoutDashboard,
  LogOut,
  Menu,
  MessagesSquare,
  Package,
  Settings,
  ShoppingCart,
  Sparkles,
  Target,
  UserRound,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/dashboard", label: "Umumiy ko'rinish", icon: LayoutDashboard },
  { to: "/dashboard/leads", label: "Murojaatlar", icon: Target },
  { to: "/dashboard/customers", label: "Mijozlar", icon: Users },
  { to: "/dashboard/conversations", label: "Suhbatlar", icon: MessagesSquare },
  { to: "/dashboard/orders", label: "Buyurtmalar", icon: ShoppingCart },
  { to: "/dashboard/inventory", label: "Ombor", icon: Boxes },
  { to: "/dashboard/products", label: "Mahsulotlar", icon: Package },
  { to: "/dashboard/operators", label: "Operatorlar", icon: UserRound },
  { to: "/dashboard/analytics", label: "Savdo tahlili", icon: BarChart3 },
  { to: "/dashboard/settings", label: "Sozlamalar", icon: Settings },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = item.to === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.to);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all",
              active
                ? "clay-raised bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground hover:shadow-clay-sm",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardShell({
  children,
  email,
}: {
  children: React.ReactNode;
  email?: string | undefined;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate({ to: "/" });
  };

  const brand = (
    <div className="flex items-center gap-2 px-3 py-4">
      <span className="clay-raised grid size-10 place-items-center overflow-hidden rounded-2xl bg-card">
        <img src={logoAsset.url} alt="Keta AI logotipi" className="size-8 object-contain" />
      </span>
      <div className="leading-tight">
        <p className="font-display text-sm font-semibold">SalesPilot AI</p>
        <p className="text-xs text-muted-foreground">AI savdo bo‘limi</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-sidebar-border/60 bg-sidebar px-3 shadow-clay lg:flex">
        {brand}
        <NavLinks />
        <div className="mt-auto border-t border-sidebar-border py-4">
          <p className="truncate px-3 pb-2 text-xs text-muted-foreground">{email ?? ""}</p>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={signOut}>
            <LogOut className="size-4" /> Chiqish
          </Button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border/50 bg-background/80 px-4 py-3 backdrop-blur-xl lg:px-8">
          <div className="flex items-center gap-2">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden" aria-label="Menyuni ochish">
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 bg-sidebar px-3 shadow-clay-lg">
                {brand}
                <NavLinks onNavigate={() => setOpen(false)} />
              </SheetContent>
            </Sheet>
            <span className="font-display text-sm font-semibold lg:hidden">SalesPilot AI</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:inline">{email}</span>
            <Button variant="outline" size="sm" className="gap-2" onClick={signOut}>
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Chiqish</span>
            </Button>
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}