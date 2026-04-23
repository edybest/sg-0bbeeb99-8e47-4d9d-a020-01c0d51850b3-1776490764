import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { NotificationInbox } from "@/components/notifications/NotificationInbox";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export function MemberTopBarNav() {
    const router = useRouter();
    const { member } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);

    useEffect(() => {
        async function loadUnreadCount() {
            if (!member?.id) return;

            try {
                const { notificationService } = await import("@/services/notificationService");
                const count = await notificationService.getUnreadCount();
                setUnreadCount(count);
            } catch (e) {
                console.error("Failed to load unread count:", e);
            }
        }

        void loadUnreadCount();

        const handleUpdate = () => {
            void loadUnreadCount();
        };

        window.addEventListener("notifications-updated", handleUpdate);
        return () => window.removeEventListener("notifications-updated", handleUpdate);
    }, [member?.id]);

    return (
        <div className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between border-b bg-white px-4 shadow-sm">
            <Link href="/member" className="flex items-center gap-2">
                <Image src="/ambc-logo.png" alt="AMBC" width={40} height={40} className="rounded-md" unoptimized />
                <h1 className="text-xl font-bold text-sky-900">AMBC</h1>
            </Link>

            <div className="flex items-center gap-4">
                <Sheet open={isNotificationOpen} onOpenChange={setIsNotificationOpen}>
                    <SheetTrigger asChild>
                        <button className="relative rounded-full p-2 hover:bg-gray-100 transition-colors">
                            <Bell className={`h-6 w-6 ${unreadCount > 0 ? "text-blue-600" : "text-gray-600"}`} />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white animate-pulse">
                                    {unreadCount > 9 ? "9+" : unreadCount}
                                </span>
                            )}
                        </button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-[85vw] sm:max-w-md p-0 flex flex-col h-full max-h-screen">
                        <SheetHeader className="px-4 sm:px-6 py-4 border-b flex-shrink-0 relative flex flex-row items-center justify-between space-y-0">
                            <SheetTitle>Notifications</SheetTitle>
                            <SheetClose asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <X className="h-4 w-4" />
                                </Button>
                            </SheetClose>
                        </SheetHeader>
                        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
                            <NotificationInbox />
                        </div>
                    </SheetContent>
                </Sheet>

                {member?.avatar_url && (
                    <Link href="/member/profile">
                        <Image
                            src={member.avatar_url}
                            alt={member.username}
                            width={40}
                            height={40}
                            className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                            unoptimized
                            loading="lazy"
                        />
                    </Link>
                )}
            </div>
        </div>
    );
}