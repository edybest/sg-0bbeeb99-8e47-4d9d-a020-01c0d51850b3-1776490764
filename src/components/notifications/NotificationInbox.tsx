import { useEffect, useMemo, useState } from "react";
import { notificationService } from "@/services/notificationService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, MailOpen, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type InboxItem = Awaited<ReturnType<typeof notificationService.listMyNotifications>>["items"][number];

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
  const [deleting, setDeleting] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const { toast } = useToast();

  const unreadCount = useMemo(() => items.filter((x) => !x.recipient.read_at).length, [items]);
  const totalPages = Math.ceil(totalCount / 10);

  async function load(page = 1) {
    setLoading(true);
    try {
      const result = await notificationService.listMyNotifications(page, 10);
      setItems(result.items);
      setTotalCount(result.totalCount);
      setHasMore(result.hasMore);
      setCurrentPage(page);
    } catch (e) {
      console.error("Load notifications failed:", e);
      setItems([]);
      toast({
        title: "Ralat",
        description: "Gagal memuatkan notifications",
        variant: "destructive",
      });
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
      window.dispatchEvent(new CustomEvent("notifications-updated"));
      toast({
        title: "Berjaya",
        description: "Notification ditanda sebagai telah dibaca",
      });
    } catch (e) {
      console.error("Mark read failed:", e);
      toast({
        title: "Ralat",
        description: "Gagal menanda notification",
        variant: "destructive",
      });
    } finally {
      setMarking(null);
    }
  }

  async function handleDelete(notificationId: string, memberId: string) {
    const key = `${notificationId}:${memberId}`;
    try {
      setDeleting(key);
      await notificationService.deleteNotification(notificationId, memberId);
      setItems((prev) =>
        prev.filter((it) => !(it.recipient.notification_id === notificationId && it.recipient.member_id === memberId))
      );
      setTotalCount((prev) => Math.max(0, prev - 1));
      window.dispatchEvent(new CustomEvent("notifications-updated"));
      toast({
        title: "Berjaya",
        description: "Notification telah dipadam",
      });
    } catch (e) {
      console.error("Delete notification failed:", e);
      toast({
        title: "Ralat",
        description: "Gagal memadam notification",
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
    }
  }

  function handlePrevPage() {
    if (currentPage > 1) {
      void load(currentPage - 1);
    }
  }

  function handleNextPage() {
    if (hasMore) {
      void load(currentPage + 1);
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
              const isRead = !!it.recipient.read_at;
              return (
                <div key={rowKey} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold">{it.notification?.title ?? "Message"}</p>
                        {!isRead && <span className="h-2 w-2 rounded-full bg-red-600" aria-label="Unread" />}
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{it.notification?.message ?? ""}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {formatDate(it.notification?.created_at ?? it.recipient.delivered_at)}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      {!isRead && (
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

                      {isRead && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void handleDelete(it.recipient.notification_id, it.recipient.member_id)}
                          disabled={deleting === rowKey}
                        >
                          {deleting === rowKey ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                  {idx !== items.length - 1 && <Separator className="mt-4" />}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && totalCount > 0 && (
          <div className="flex items-center justify-between border-t pt-4">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages} ({totalCount} total)
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={currentPage === 1 || loading}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={handleNextPage} disabled={!hasMore || loading}>
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <Button variant="outline" className="w-full" onClick={() => void load(currentPage)} disabled={loading}>
          Refresh
        </Button>
      </CardContent>
    </Card>
  );
}