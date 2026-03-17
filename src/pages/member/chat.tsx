import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { SEO } from "@/components/SEO";
import { MemberLayout } from "@/components/member/MemberLayout";
import { PageAccessGuard } from "@/components/PageAccessGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Send,
  ArrowLeft,
  MessageSquarePlus,
  Users,
  Search,
  MoreVertical,
  VolumeX,
  Volume2,
  Ban,
  Trash2,
  AlertCircle
} from "lucide-react";
import {
  listMyChats,
  getChatRoom,
  listMessages,
  sendMessage,
  markMessagesAsRead,
  subscribeToMessages,
  getOrCreateDirectChat,
  listAllMembers,
  ensureLobbyRoom,
  toggleSilenceMember,
  toggleBanMember,
  adminDeleteMessage,
  type ChatRoomWithDetails,
  type ChatMessageWithSender,
  type ChatParticipant
} from "@/services/chatService";
import { cn } from "@/lib/utils";

export default function ChatPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { member, loading: authLoading } = useAuth(true, false);
  
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const messagesContainerRef = React.useRef<HTMLDivElement>(null);

  const [rooms, setRooms] = useState<ChatRoomWithDetails[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoomWithDetails | null>(null);
  const [messages, setMessages] = useState<ChatMessageWithSender[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [allMembers, setAllMembers] = useState<Array<{ id: string; full_name: string; avatar_url: string | null }>>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Initialize
  useEffect(() => {
    async function init() {
      try {
        await ensureLobbyRoom();
        await loadRooms();
      } catch (error) {
        console.error(error);
      }
    }
    init();
  }, []);

  // Room selection
  useEffect(() => {
    if (selectedRoom) {
      loadMessages(selectedRoom.id);
      markMessagesAsRead(selectedRoom.id);
    }
  }, [selectedRoom]);

  // Realtime subscription
  useEffect(() => {
    if (!selectedRoom?.id || !member?.id) return;

    const unsubscribe = subscribeToMessages(selectedRoom.id, (newMsg) => {
      setMessages((prev) => {
        if (prev.some(m => m.id === newMsg.id)) return prev;
        
        const wasAtBottom = isScrolledToBottom();
        const isMyMessage = newMsg.sender_id === member.id;
        
        if (wasAtBottom || isMyMessage) {
          setTimeout(() => scrollToBottom("smooth"), 100);
        } else {
          setUnreadCount(c => c + 1);
        }
        
        return [...prev, newMsg];
      });
    });

    return () => unsubscribe();
  }, [selectedRoom?.id, member?.id]);

  // Scroll detection
  const isScrolledToBottom = () => {
    if (!messagesContainerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    return scrollHeight - scrollTop - clientHeight < 100;
  };

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const isAtBottom = isScrolledToBottom();
    setShowScrollButton(!isAtBottom);
    if (isAtBottom) setUnreadCount(0);
  };

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) container.addEventListener("scroll", handleScroll);
    return () => container?.removeEventListener("scroll", handleScroll);
  }, []);

  // Loaders
  async function loadRooms() {
    setLoading(true);
    const data = await listMyChats();
    setRooms(data);
    setLoading(false);
  }

  async function loadMessages(roomId: string) {
    const data = await listMessages(roomId);
    setMessages(data);
    setTimeout(() => scrollToBottom("auto"), 100);
  }

  // Actions
  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !selectedRoom || sending) return;

    setSending(true);
    const success = await sendMessage(selectedRoom.id, newMessage);
    if (success) {
      setNewMessage("");
    } else {
      toast({ title: "Error", description: "Gagal menghantar mesej", variant: "destructive" });
    }
    setSending(false);
  }

  async function handleStartChat(targetMemberId: string) {
    if (!member) return;
    setShowNewChat(false);
    
    const roomId = await getOrCreateDirectChat(targetMemberId);
    if (roomId) {
      const room = await getChatRoom(roomId);
      if (room) setSelectedRoom(room);
      await loadRooms();
    } else {
      toast({ title: "Error", description: "Gagal memulakan chat", variant: "destructive" });
    }
  }

  // Admin Actions
  async function handleToggleSilence(participant: ChatParticipant) {
    if (!selectedRoom) return;
    const newStatus = !participant.is_silenced;
    const success = await toggleSilenceMember(selectedRoom.id, participant.member_id, newStatus);
    if (success) {
      toast({ title: "Berjaya", description: `Member telah di${newStatus ? 'silenced' : 'unsilenced'}` });
      // Update local state
      const updatedRoom = await getChatRoom(selectedRoom.id);
      if (updatedRoom) setSelectedRoom(updatedRoom);
    }
  }

  async function handleToggleBan(participant: ChatParticipant) {
    if (!selectedRoom) return;
    if (confirm("Adakah anda pasti mahu Ban/Unban member ini dari room ini?")) {
      const newStatus = !participant.is_banned;
      const success = await toggleBanMember(selectedRoom.id, participant.member_id, newStatus);
      if (success) {
        toast({ title: "Berjaya", description: `Member telah di${newStatus ? 'banned' : 'unbanned'}` });
        const updatedRoom = await getChatRoom(selectedRoom.id);
        if (updatedRoom) setSelectedRoom(updatedRoom);
      }
    }
  }

  async function handleDeleteMessage(msgId: string) {
    if (confirm("Padam mesej ini?")) {
      const success = await adminDeleteMessage(msgId);
      if (success) {
        toast({ title: "Berjaya", description: "Mesej dipadam" });
        setMessages(messages.filter(m => m.id !== msgId));
      }
    }
  }

  // Helpers
  function getOtherMember(room: ChatRoomWithDetails) {
    if (room.type === "lobby" || room.type === "group") return null;
    return room.participants?.find(p => p.member?.id !== member?.id)?.member;
  }

  function getRoomName(room: ChatRoomWithDetails) {
    if (room.type === "lobby") return "Lobby AMBC Club";
    if (room.type === "group") return room.name || "Group Chat";
    const other = getOtherMember(room);
    return other?.full_name || "Direct Chat";
  }

  function getRoomAvatar(room: ChatRoomWithDetails) {
    if (room.type === "lobby" || room.type === "group") return null;
    const other = getOtherMember(room);
    return other?.avatar_url;
  }

  const isAdmin = member?.is_admin === true;

  if (authLoading || loading) {
    return (
      <PageAccessGuard pagePath="/member/chat" requireAuth={true}>
        <MemberLayout>
          <SEO title="Chat - AMBC Club" />
          <div className="flex h-screen items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
          </div>
        </MemberLayout>
      </PageAccessGuard>
    );
  }

  return (
    <PageAccessGuard pagePath="/member/chat" requireAuth={true}>
      <MemberLayout>
        <SEO title="Chat - AMBC Club" />
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)] flex max-w-7xl mx-auto border-x border-gray-200 dark:border-gray-800">
            
            {/* Sidebar / Chat List */}
            <div className={`${selectedRoom ? "hidden md:flex" : "flex"} flex-col w-full md:w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700`}>
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-rose-600 to-pink-600 text-white flex justify-between items-center">
                <h1 className="text-xl font-bold">Chats</h1>
                <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
                  <DialogTrigger asChild>
                    <Button size="icon" variant="ghost" className="text-white hover:bg-white/20" onClick={() => {
                      listAllMembers().then(m => setAllMembers(m.filter(x => x.id !== member?.id)));
                    }}>
                      <MessageSquarePlus className="h-5 w-5" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Start New Chat</DialogTitle></DialogHeader>
                    <Input placeholder="Search member..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    <ScrollArea className="h-72 mt-4">
                      {allMembers.filter(m => m.full_name.toLowerCase().includes(searchQuery.toLowerCase())).map(m => (
                        <Button key={m.id} variant="ghost" className="w-full justify-start mb-2" onClick={() => handleStartChat(m.id)}>
                          <Avatar className="h-8 w-8 mr-3"><AvatarFallback>{m.full_name[0]}</AvatarFallback></Avatar>
                          {m.full_name}
                        </Button>
                      ))}
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
              </div>

              <ScrollArea className="flex-1">
                {rooms.map(room => (
                  <button
                    key={room.id}
                    onClick={() => setSelectedRoom(room)}
                    className={cn(
                      "w-full p-4 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-800 transition-colors text-left",
                      selectedRoom?.id === room.id && "bg-rose-50 dark:bg-gray-700"
                    )}
                  >
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      <AvatarImage src={getRoomAvatar(room) || undefined} />
                      <AvatarFallback className="bg-rose-100 text-rose-600">
                        {room.type !== 'direct' ? <Users className="h-5 w-5" /> : getRoomName(room)[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <h3 className="font-semibold truncate">{getRoomName(room)}</h3>
                        {room.unread_count ? (
                          <Badge className="bg-rose-500">{room.unread_count}</Badge>
                        ) : null}
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {room.last_message?.message || "Tiada mesej"}
                      </p>
                    </div>
                  </button>
                ))}
              </ScrollArea>
            </div>

            {/* Chat Window */}
            {selectedRoom ? (
              <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 relative">
                {/* Header */}
                <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shadow-sm z-10">
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedRoom(null)}>
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <Avatar>
                      <AvatarImage src={getRoomAvatar(selectedRoom) || undefined} />
                      <AvatarFallback className="bg-rose-100 text-rose-600">
                        {selectedRoom.type !== 'direct' ? <Users className="h-5 w-5" /> : getRoomName(selectedRoom)[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="font-bold">{getRoomName(selectedRoom)}</h2>
                      {selectedRoom.type === 'lobby' && <Badge variant="secondary" className="text-xs">Lobby Rasmi</Badge>}
                    </div>
                  </div>

                  {/* Admin Participants Menu (Only for Lobby/Group) */}
                  {isAdmin && selectedRoom.type !== 'direct' && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">Urus Member</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Senarai Member ({getRoomName(selectedRoom)})</DialogTitle></DialogHeader>
                        <ScrollArea className="h-[400px]">
                          {selectedRoom.participants?.map(p => (
                            <div key={p.id} className="flex items-center justify-between py-2 border-b">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8"><AvatarFallback>{p.member.full_name[0]}</AvatarFallback></Avatar>
                                <span className={p.is_banned ? "line-through text-red-500" : ""}>{p.member.full_name}</span>
                                {p.is_silenced && <VolumeX className="h-3 w-3 text-orange-500" />}
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" variant={p.is_silenced ? "default" : "secondary"} onClick={() => handleToggleSilence(p)}>
                                  {p.is_silenced ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                                </Button>
                                <Button size="sm" variant={p.is_banned ? "default" : "destructive"} onClick={() => handleToggleBan(p)}>
                                  <Ban className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </ScrollArea>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={messagesContainerRef}>
                  {selectedRoom.is_banned ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center bg-red-50 text-red-600 p-6 rounded-lg max-w-sm">
                        <Ban className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <h3 className="font-bold text-lg mb-1">Anda Telah Di-Ban</h3>
                        <p className="text-sm">Anda tidak lagi boleh mengakses room ini.</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {messages.map(msg => {
                        const isMine = msg.sender_id === member?.id;
                        return (
                          <div key={msg.id} className={cn("flex gap-3 max-w-[85%]", isMine ? "ml-auto flex-row-reverse" : "")}>
                            {!isMine && (
                              <Avatar className="h-8 w-8 mt-1"><AvatarFallback className="text-xs">{msg.sender.full_name[0]}</AvatarFallback></Avatar>
                            )}
                            <div className={cn("flex flex-col gap-1", isMine ? "items-end" : "items-start")}>
                              {!isMine && <span className="text-xs text-gray-500 ml-1">{msg.sender.full_name}</span>}
                              
                              <div className="group relative flex items-center gap-2">
                                {/* Admin Delete Button */}
                                {isAdmin && !isMine && (
                                  <button onClick={() => handleDeleteMessage(msg.id)} className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded transition-opacity">
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                                
                                <div className={cn(
                                  "px-4 py-2 rounded-2xl",
                                  isMine ? "bg-rose-600 text-white rounded-tr-sm" : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-tl-sm shadow-sm"
                                )}>
                                  <p className="text-sm break-words whitespace-pre-wrap">{msg.message}</p>
                                </div>
                              </div>
                              <span className="text-[10px] text-gray-400 mt-0.5">
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Input Area */}
                {!selectedRoom.is_banned && (
                  <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                    {selectedRoom.is_silenced ? (
                      <div className="flex items-center justify-center gap-2 text-orange-500 bg-orange-50 p-3 rounded-lg border border-orange-200">
                        <VolumeX className="h-5 w-5" />
                        <p className="text-sm font-medium">Admin telah mute anda dari menghantar mesej di sini.</p>
                      </div>
                    ) : (
                      <form onSubmit={handleSend} className="flex gap-2">
                        <Input
                          value={newMessage}
                          onChange={e => setNewMessage(e.target.value)}
                          placeholder="Taip mesej..."
                          className="flex-1 bg-gray-50 focus-visible:ring-rose-500"
                        />
                        <Button type="submit" disabled={!newMessage.trim() || sending} className="bg-rose-600 hover:bg-rose-700 text-white shrink-0">
                          <Send className="h-4 w-4" />
                        </Button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden md:flex flex-1 items-center justify-center flex-col text-gray-400">
                <MessageSquarePlus className="h-16 w-16 mb-4 opacity-20" />
                <p>Pilih chat untuk mula berbual</p>
              </div>
            )}
          </div>
        </div>
      </MemberLayout>
    </PageAccessGuard>
  );
}