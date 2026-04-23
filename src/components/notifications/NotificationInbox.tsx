import { useEffect, useMemo, useState } from "react";
import { notificationService } from "@/services/notificationService";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2, MailOpen, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type InboxItem = Awaited<ReturnType<typeof notificationService.listMyNotifications>>[number];

const PAGE_SIZE = 10;

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
  const { toast } = useToast();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ notificationId: string; memberId: string } | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const unreadCount = useMemo(() => items.filter((x) => !x.recipient.read_at).length, [items]);
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  async function load(page = 1) {
    setLoading(true);
    try {
      const offset = (page - 1) * PAGE_SIZE;
      const [data, total] = await Promise.all([
        notificationService.listMyNotifications(PAGE_SIZE, offset),
        notificationService.getTotalCount(),
      ]);
      setItems(data);
      setTotalCount(total);
      setCurrentPage(page);
    } catch (e) {
      console.error("Load notifications failed:", e);
      setItems([]);
      toast({
        title: "Error",
        description: "Gagal load notifications",
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
        title: "✓ Ditandakan sebagai dibaca",
        duration: 2000,
      });
    } catch (e) {
      console.error("Mark read failed:", e);
      toast({
        title: "Error",
        description: "Gagal mark as read",
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
        prev.filter(
          (it) => !(it.recipient.notification_id === notificationId && it.recipient.member_id === memberId)
        )
      );
      setTotalCount((prev) => prev - 1);
      window.dispatchEvent(new CustomEvent("notifications-updated"));
      toast({
        title: "✓ Notification dipadam",
        duration: 2000,
      });
    } catch (e) {
      console.error("Delete failed:", e);
      toast({
        title: "Error",
        description: "Gagal delete notification",
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
      setDeleteTarget(null);
    }
  }

  function confirmDelete(notificationId: string, memberId: string) {
    setDeleteTarget({ notificationId, memberId });
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {loading ? "Loading..." : unreadCount > 0 ? `${unreadCount} unread` : "All read"}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading...
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border p-4 text-sm text-center text-muted-foreground">
            Tiada message lagi.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((it, idx) => {
              const rowKey = `${it.recipient.notification_id}:${it.recipient.member_id}`;
              return (
                <div key={rowKey}>
                  <div className="rounded-lg border p-4 bg-white">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">{it.notification?.title ?? "Message"}</p>
                          {!it.recipient.read_at && (
                            <span className="h-2 w-2 rounded-full bg-red-600 flex-shrink-0" aria-label="Unread" />
                          )}
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                          {it.notification?.message ?? ""}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {formatDate(it.notification?.created_at ?? it.recipient.delivered_at)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
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
                              <MailOpen className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => confirmDelete(it.recipient.notification_id, it.recipient.member_id)}
                          disabled={deleting === rowKey}
                        >
                          {deleting === rowKey ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                  {idx !== items.length - 1 && <Separator className="my-2" />}
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void load(currentPage - 1)}
              disabled={loading || currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void load(currentPage + 1)}
              disabled={loading || currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}

        <Button variant="outline" className="w-full" onClick={() => void load(currentPage)} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Refresh
        </Button>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Notification?</AlertDialogTitle>
            <AlertDialogDescription>
              Notification ini akan dipadam permanently. Action ini tidak boleh undo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (deleteTarget) {
                  void handleDelete(deleteTarget.notificationId, deleteTarget.memberId);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}