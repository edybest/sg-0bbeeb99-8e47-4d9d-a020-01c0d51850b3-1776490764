import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { SEO } from "@/components/SEO";
import { MemberLayout } from "@/components/member/MemberLayout";
import { PageAccessGuard } from "@/components/PageAccessGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Send,
  ArrowLeft,
  MessageSquarePlus,
  Users,
  Search,
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
  type ChatRoomWithDetails,
  type ChatMessageWithSender,
} from "@/services/chatService";

export default function ChatPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { member } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [rooms, setRooms] = useState<ChatRoomWithDetails[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoomWithDetails | null>(null);
  const [messages, setMessages] = useState<ChatMessageWithSender[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [allMembers, setAllMembers] = useState<Array<{ id: string; full_name: string; avatar_url: string | null }>>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Load chat rooms
  useEffect(() => {
    void loadRooms();
  }, []);

  // Load messages when room selected
  useEffect(() => {
    if (selectedRoom) {
      void loadMessages(selectedRoom.id);
      void markMessagesAsRead(selectedRoom.id);

      // Subscribe to new messages
      const unsubscribe = subscribeToMessages(selectedRoom.id, (msg) => {
        setMessages((prev) => [...prev, msg]);
        void markMessagesAsRead(selectedRoom.id);
        scrollToBottom();
      });

      return () => {
        unsubscribe();
      };
    }
  }, [selectedRoom]);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load all members for new chat dialog
  useEffect(() => {
    if (showNewChat) {
      void loadAllMembers();
    }
  }, [showNewChat]);

  async function loadRooms() {
    setLoading(true);
    const data = await listMyChats();
    setRooms(data);
    setLoading(false);
  }

  async function loadMessages(roomId: string) {
    const data = await listMessages(roomId, 100);
    setMessages(data);
  }

  async function loadAllMembers() {
    const data = await listAllMembers();
    // Filter out current user
    setAllMembers(data.filter((m) => m.id !== member?.id));
  }

  async function handleSend() {
    if (!newMessage.trim() || !selectedRoom || sending) return;

    setSending(true);
    const msg = await sendMessage(selectedRoom.id, newMessage);
    if (msg) {
      setNewMessage("");
      // Message will be added via realtime subscription
    } else {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
    setSending(false);
  }

  async function handleStartChat(memberId: string) {
    const room = await getOrCreateDirectChat(memberId);
    if (room) {
      const roomDetails = await getChatRoom(room.id);
      if (roomDetails) {
        setSelectedRoom(roomDetails);
        setShowNewChat(false);
        // Reload rooms list to include new chat
        void loadRooms();
      }
    } else {
      toast({
        title: "Error",
        description: "Failed to create chat",
        variant: "destructive",
      });
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  function getOtherMember(room: ChatRoomWithDetails) {
    if (room.type === "group") return null;
    const participants = Array.isArray(room.participants) ? room.participants : [];
    return participants.find((p) => p.member?.id !== member?.id)?.member;
  }

  function getRoomName(room: ChatRoomWithDetails) {
    if (room.type === "group") return room.name;
    const other = getOtherMember(room);
    return other?.full_name || "Unknown";
  }

  function getRoomAvatar(room: ChatRoomWithDetails) {
    if (room.type === "group") return null;
    const other = getOtherMember(room);
    return other?.avatar_url;
  }

  const filteredMembers = allMembers.filter((m) =>
    m.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <PageAccessGuard pagePath="/member/chat" requireAuth={true}>
        <MemberLayout>
          <SEO title="Chat - AMBC Club" />
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading chats...</p>
            </div>
          </div>
        </MemberLayout>
      </PageAccessGuard>
    );
  }

  return (
    <PageAccessGuard pagePath="/member/chat" requireAuth={true}>
      <MemberLayout>
        <SEO title="Chat - AMBC Club" />
        <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          {/* Mobile: Full screen chat */}
          <div className="h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)] flex">
            {/* Chat List - Hidden when room selected on mobile */}
            <div className={`${selectedRoom ? "hidden md:flex" : "flex"} flex-col w-full md:w-80 border-r border-rose-100 dark:border-gray-700 bg-white dark:bg-gray-800`}>
              {/* Header */}
              <div className="p-4 border-b border-rose-100 dark:border-gray-700 bg-gradient-to-r from-rose-500 to-pink-500 text-white">
                <div className="flex items-center justify-between">
                  <h1 className="text-xl font-bold">Chats</h1>
                  <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
                    <DialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="text-white hover:bg-white/20">
                        <MessageSquarePlus className="h-5 w-5" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Start New Chat</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search members..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                        <ScrollArea className="h-[400px]">
                          <div className="space-y-2">
                            {filteredMembers.map((m) => (
                              <Button
                                key={m.id}
                                variant="ghost"
                                className="w-full justify-start"
                                onClick={() => void handleStartChat(m.id)}
                              >
                                <Avatar className="h-8 w-8 mr-3">
                                  <AvatarImage src={m.avatar_url || undefined} />
                                  <AvatarFallback className="bg-gradient-to-br from-rose-500 to-pink-500 text-white text-sm">
                                    {m.full_name[0]?.toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span>{m.full_name}</span>
                              </Button>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* Chat List */}
              <ScrollArea className="flex-1">
                {rooms.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <MessageSquarePlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No chats yet</p>
                    <p className="text-sm mt-2">Start a new conversation!</p>
                  </div>
                ) : (
                  <div className="divide-y divide-rose-100 dark:divide-gray-700">
                    {rooms.map((room) => (
                      <button
                        key={room.id}
                        onClick={() => setSelectedRoom(room)}
                        className={`w-full p-4 hover:bg-rose-50 dark:hover:bg-gray-700 transition-colors text-left ${
                          selectedRoom?.id === room.id ? "bg-rose-50 dark:bg-gray-700" : ""
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="h-12 w-12 flex-shrink-0">
                            <AvatarImage src={getRoomAvatar(room) || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-rose-500 to-pink-500 text-white">
                              {room.type === "group" ? <Users className="h-5 w-5" /> : getRoomName(room)[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-semibold text-sm truncate">{getRoomName(room)}</h3>
                              {room.unread_count && room.unread_count > 0 ? (
                                <Badge className="bg-rose-500 text-white ml-2 flex-shrink-0">
                                  {room.unread_count}
                                </Badge>
                              ) : null}
                            </div>
                            {room.last_message ? (
                              <p className="text-xs text-muted-foreground truncate">
                                {room.last_message.message}
                              </p>
                            ) : (
                              <p className="text-xs text-muted-foreground italic">No messages yet</p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Chat Window */}
            {selectedRoom ? (
              <div className="flex-1 flex flex-col bg-white dark:bg-gray-800">
                {/* Chat Header */}
                <div className="p-4 border-b border-rose-100 dark:border-gray-700 bg-gradient-to-r from-rose-500 to-pink-500 text-white">
                  <div className="flex items-center gap-3">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="md:hidden text-white hover:bg-white/20"
                      onClick={() => setSelectedRoom(null)}
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={getRoomAvatar(selectedRoom) || undefined} />
                      <AvatarFallback className="bg-white text-rose-600">
                        {selectedRoom.type === "group" ? <Users className="h-5 w-5" /> : getRoomName(selectedRoom)[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="font-semibold">{getRoomName(selectedRoom)}</h2>
                      <p className="text-xs text-white/80">
                        {selectedRoom.type === "group" ? `${selectedRoom.participants?.length || 0} members` : "Direct Message"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map((msg) => {
                      const isOwn = msg.sender_id === member?.id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                        >
                          <div className={`flex gap-2 max-w-[80%] ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
                            {!isOwn && (
                              <Avatar className="h-8 w-8 flex-shrink-0">
                                <AvatarImage src={msg.sender.avatar_url || undefined} />
                                <AvatarFallback className="bg-gradient-to-br from-rose-500 to-pink-500 text-white text-xs">
                                  {msg.sender.full_name[0]?.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <div>
                              {!isOwn && (
                                <p className="text-xs text-muted-foreground mb-1 px-3">
                                  {msg.sender.full_name}
                                </p>
                              )}
                              <Card
                                className={`p-3 ${
                                  isOwn
                                    ? "bg-gradient-to-br from-rose-500 to-pink-500 text-white border-0"
                                    : "bg-gray-100 dark:bg-gray-700"
                                }`}
                              >
                                <p className="text-sm break-words">{msg.message}</p>
                                <p className={`text-xs mt-1 ${isOwn ? "text-white/70" : "text-muted-foreground"}`}>
                                  {new Date(msg.created_at).toLocaleTimeString("en-US", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </Card>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="p-4 border-t border-rose-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void handleSend();
                    }}
                    className="flex gap-2"
                  >
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      disabled={sending}
                      className="flex-1"
                    />
                    <Button
                      type="submit"
                      disabled={!newMessage.trim() || sending}
                      className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="hidden md:flex flex-1 items-center justify-center bg-gradient-to-br from-rose-50 to-pink-50 dark:from-gray-900 dark:to-gray-800">
                <div className="text-center text-muted-foreground">
                  <MessageSquarePlus className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Select a chat to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </MemberLayout>
    </PageAccessGuard>
  );
}