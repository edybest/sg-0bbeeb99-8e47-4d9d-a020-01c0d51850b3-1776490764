import { useEffect, useMemo, useState } from "react";
import { notificationService } from "@/services/notificationService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, MailOpen } from "lucide-react";

type InboxItem = Awaited<ReturnType<typeof notificationService.listMyNotifications>>[number];

function formatDate(value?: string | null) {
  if (!value) return "";
  try {
    const d = new Date(value);
    return d.toLocaleString();
  } catch {
    return value;
  }
}

export function NotificationInbox() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState<string | null>(null);

  const unreadCount = useMemo(() => items.filter((x) => !x.recipient.is_read).length, [items]);

  async function load() {
    setLoading(true);
    try {
      const data = await notificationService.listMyNotifications(30);
      setItems(data);
    } catch (e) {
      console.error("Load notifications failed:", e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleMarkRead(id: string) {
    try {
      setMarking(id);
      await notificationService.markRead(id);
      setItems((prev) => prev.map((it) => (it.recipient.id === id ? { ...it, recipient: { ...it.recipient, is_read: true } } : it)));
    } catch (e) {
      console.error("Mark read failed:", e);
    } finally {
      setMarking(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-base">Notifications</CardTitle>
        <div className="text-sm text-muted-foreground">
          {loading ? "Loading..." : unreadCount > 0 ? `${unreadCount} unread` : "All read"}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading...
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border p-4 text-sm text-muted-foreground">Tiada message lagi.</div>
        ) : (
          <div className="space-y-3">
            {items.map((it, idx) => (
              <div key={it.recipient.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold">{it.notification?.title ?? "Message"}</p>
                      {!it.recipient.is_read && <span className="h-2 w-2 rounded-full bg-red-600" aria-label="Unread" />}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{it.notification?.body ?? ""}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{formatDate(it.notification?.created_at ?? it.recipient.created_at)}</p>
                  </div>

                  {!it.recipient.is_read && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleMarkRead(it.recipient.id)}
                      disabled={marking === it.recipient.id}
                    >
                      {marking === it.recipient.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <MailOpen className="mr-2 h-4 w-4" />
                          Read
                        </>
                      )}
                    </Button>
                  )}
                </div>
                {idx !== items.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
          </div>
        )}

        <Button variant="outline" className="w-full" onClick={() => void load()} disabled={loading}>
          Refresh
        </Button>
      </CardContent>
    </Card>
  );
}