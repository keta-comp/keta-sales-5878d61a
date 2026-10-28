import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Bell, Info, TriangleAlert, Wrench } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getDashboardKpis } from "@/lib/workspace.functions";
import { getMyAnnouncements, markAnnouncementRead } from "@/lib/notifications.functions";
import { t } from "@/lib/i18n";

const KIND_ICON = { info: Info, warning: TriangleAlert, maintenance: Wrench } as const;

function kindIcon(kind: string) {
  const Icon = KIND_ICON[kind as keyof typeof KIND_ICON] ?? Info;
  return <Icon className="size-4 shrink-0 text-muted-foreground" />;
}

function fmtStamp(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

/** Platform announcements come from the Control Center; work items come from real CRM rows. */
export function NotificationsBell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchKpis = useServerFn(getDashboardKpis);
  const fetchAnnouncements = useServerFn(getMyAnnouncements);
  const markRead = useServerFn(markAnnouncementRead);

  const { data } = useQuery({
    queryKey: ["kpis"],
    queryFn: () => fetchKpis(),
    refetchInterval: 60_000,
  });
  const announcements = useQuery({
    queryKey: ["announcements"],
    queryFn: () => fetchAnnouncements(),
    refetchInterval: 60_000,
  });

  const todos = data?.todos ?? [];
  const items = announcements.data ?? [];
  const unread = items.filter((item) => !item.read).length;
  const total = unread + todos.reduce((sum, todo) => sum + todo.count, 0);

  const openAnnouncement = (id: string, alreadyRead: boolean) => {
    if (alreadyRead) return;
    void markRead({ data: { id } })
      .then(() => queryClient.invalidateQueries({ queryKey: ["announcements"] }))
      .catch(() => undefined);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative" aria-label={t("Bildirishnomalar")}>
          <Bell className="size-4" />
          {total > 0 ? (
            <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-foreground px-1 text-[10px] font-semibold text-background">
              {total > 99 ? "99+" : total}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-2">
        <p className="px-2 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("Platforma e’lonlari")}
        </p>
        {announcements.isPending ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">{t("Yuklanmoqda…")}</p>
        ) : items.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">{t("E’lonlar yo‘q.")}</p>
        ) : (
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openAnnouncement(item.id, item.read)}
                className={`clay-hover flex w-full gap-2 rounded-xl px-2 py-2 text-left text-sm ${
                  item.read ? "text-muted-foreground" : "bg-muted/60"
                }`}
              >
                {kindIcon(item.kind)}
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-medium">{item.title}</span>
                    <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                      {fmtStamp(item.createdAt)}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{item.body}</span>
                </span>
                {item.read ? null : <span className="mt-1 size-2 shrink-0 rounded-full bg-foreground" />}
              </button>
            ))}
          </div>
        )}

        <p className="mt-2 border-t border-border/60 px-2 pt-2 pb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("Usturta turgan ishlar")}
        </p>
        {todos.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">{t("Hozircha yangilik yo‘q.")}</p>
        ) : (
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {todos.map((todo) => (
              <button
                key={todo.key}
                type="button"
                className="clay-hover flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm"
                onClick={() =>
                  void navigate({
                    to: todo.to,
                    ...(todo.search ? { search: todo.search } : {}),
                  } as never)
                }
              >
                <span className="clay-inset grid size-7 shrink-0 place-items-center text-xs font-semibold">
                  {todo.count}
                </span>
                <span className="text-muted-foreground">{t(todo.label)}</span>
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
