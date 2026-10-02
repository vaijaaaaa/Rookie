"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { createClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types";

/** Notification center with Supabase Realtime for new rows. */
export function NotificationBell({ userId, initial }: { userId: string; initial: Notification[] }) {
  const [items, setItems] = useState<Notification[]>(initial);
  const unread = items.filter((n) => !n.read_at).length;

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const n = payload.new as Notification;
          setItems((prev) => [n, ...prev].slice(0, 30));
          toast(n.title, { description: n.body || undefined });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  async function markAllRead() {
    const supabase = createClient();
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
    await supabase.from("notifications").update({ read_at: now }).eq("user_id", userId).is("read_at", null);
  }

  async function markRead(id: string) {
    const supabase = createClient();
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: now } : n)));
    await supabase.from("notifications").update({ read_at: now }).eq("id", id);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Notifications (${unread} unread)`} className="relative">
          <Bell className="size-4" />
          {unread > 0 ? (
            <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-brand font-mono text-[9px] font-bold text-brand-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[22rem] p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-medium">Notifications</p>
          {unread > 0 ? (
            <Button variant="ghost" size="sm" onClick={markAllRead}>
              <CheckCheck /> Mark all read
            </Button>
          ) : null}
        </div>
        <ul className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <li className="px-3 py-8 text-center text-sm text-muted-foreground">You&apos;re all caught up.</li>
          ) : (
            items.map((n) => {
              const body = (
                <div className="flex gap-2.5">
                  <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-brand")} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{n.title}</p>
                    {n.body ? <p className="line-clamp-2 text-xs text-muted-foreground">{n.body}</p> : null}
                    <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{timeAgo(n.created_at)}</p>
                  </div>
                </div>
              );
              return (
                <li key={n.id} className="border-b last:border-0">
                  {n.link ? (
                    <Link href={n.link} onClick={() => markRead(n.id)} className="block px-3 py-2.5 hover:bg-accent">
                      {body}
                    </Link>
                  ) : (
                    <button type="button" onClick={() => markRead(n.id)} className="block w-full px-3 py-2.5 text-left hover:bg-accent">
                      {body}
                    </button>
                  )}
                </li>
              );
            })
          )}
        </ul>
        <div className="border-t px-3 py-2 text-center">
          <Link href="/notifications" className="text-xs text-muted-foreground hover:text-foreground">
            View all notifications
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
