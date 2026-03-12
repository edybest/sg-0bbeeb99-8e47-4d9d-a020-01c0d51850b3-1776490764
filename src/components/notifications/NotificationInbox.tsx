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

  const unreadCount = useMemo(() => items.filter((x) => !x.recipient.read_at).length, [items]);

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

  async function handleMarkRead(notificationId: string, memberId: string) {
    const key = `${notificationId}:${memberId}`;
    try {
      setMarking(key);
      await notificationService.markRead(notificationId, memberId);
      setItems((prev) =>
        prev.map((it) =>
          it.recipient.notification_id === notificationId && it.recipient.member_id === memberId
            ? { ...it, recipient: { ...it.recipient, read_at: new Date().toISOString() } }
            : it
        )
      );
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
            {items.map((it, idx) => {
              const rowKey = `${it.recipient.notification_id}:${it.recipient.member_id}`;
              return (
                <div key={rowKey} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold">{it.notification?.title ?? "Message"}</p>
                        {!it.recipient.read_at && <span className="h-2 w-2 rounded-full bg-red-600" aria-label="Unread" />}
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{it.notification?.message ?? ""}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {formatDate(it.notification?.created_at ?? it.recipient.delivered_at)}
                      </p>
                    </div>

                    {!it.recipient.read_at && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleMarkRead(it.recipient.notification_id, it.recipient.member_id)}
                        disabled={marking === rowKey}
                      >
                        {marking === rowKey ? (
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
              );
            })}
          </div>
        )}

        <Button variant="outline" className="w-full" onClick={() => void load()} disabled={loading}>
          Refresh
        </Button>
      </CardContent>
    </Card>
  );
}