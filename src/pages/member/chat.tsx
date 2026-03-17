import React from "react";
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
  ensureLobbyRoom,
  type ChatRoomWithDetails,
  type ChatMessageWithSender,
} from "@/services/chatService";
import { cn } from "@/lib/utils";

export default function ChatPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { member, loading: authLoading, isAuthenticated } = useAuth(true, false);
  
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const messagesContainerRef = React.useRef<HTMLDivElement>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");

  const [rooms, setRooms] = useState<ChatRoomWithDetails[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoomWithDetails | null>(null);
  const [messages, setMessages] = useState<ChatMessageWithSender[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [allMembers, setAllMembers] = useState<Array<{ id: string; full_name: string; avatar_url: string | null }>>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [creatingChat, setCreatingChat] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load chat rooms
  useEffect(() => {
    async function init() {
      try {
        setDebugInfo("🔄 Loading...");
        
        // Ensure user joins lobby
        const lobbyId = await ensureLobbyRoom();
        setDebugInfo(`🏛️ Lobby: ${lobbyId ? '✅' : '❌'} | ID: ${lobbyId?.slice(0, 8) || 'none'}`);
        
        // Then load all chats
        await loadRooms();
      } catch (error) {
        setDebugInfo(`❌ Error: ${error}`);
      }
    }
    void init();
  }, []);

  // Load messages when room selected
  useEffect(() => {
    if (selectedRoom) {
      void loadMessages(selectedRoom.id);
      void markMessagesAsRead(selectedRoom.id);
    }
  }, [selectedRoom]);

  // Auto-scroll to bottom
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Check if user is scrolled to bottom
  const isScrolledToBottom = () => {
    if (!messagesContainerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    return scrollHeight - scrollTop - clientHeight < 100;
  };

  // Handle scroll event
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const isAtBottom = isScrolledToBottom();
    setShowScrollButton(!isAtBottom);
    if (isAtBottom) {
      setUnreadCount(0);
    }
  };

  // Load all members for new chat dialog
  useEffect(() => {
    if (showNewChat) {
      void loadAllMembers();
    }
  }, [showNewChat]);

  // Subscribe to new messages
  useEffect(() => {
    if (!selectedRoom?.id || !member?.id) return;

    const unsubscribe = subscribeToMessages(selectedRoom.id, (newMsg) => {
      setMessages((prev) => {
        // Check if message already exists
        if (prev.some(m => m.id === newMsg.id)) return prev;
        
        const wasAtBottom = isScrolledToBottom();
        const isMyMessage = newMsg.sender_id === member.id;
        
        // Auto-scroll if user was at bottom OR it's their own message
        if (wasAtBottom || isMyMessage) {
          setTimeout(() => scrollToBottom("smooth"), 100);
        } else {
          // Show notification for new messages when scrolled up
          setUnreadCount(c => c + 1);
          
          // Play notification sound (optional)
          if (!isMyMessage) {
            try {
              const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE=");
              audio.volume = 0.3;
              void audio.play();
            } catch (e) {
              // Ignore audio errors
            }
          }
        }
        
        return [...prev, newMsg];
      });
    });

    return () => {
      unsubscribe();
    };
  }, [selectedRoom?.id, member?.id]);

  // Add scroll event listener
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  async function loadRooms() {
    setLoading(true);
    const data = await listMyChats();
    
    const hasLobby = data.some(r => r.name === 'Lobby AMBC Club');
    setDebugInfo(prev => `${prev} | 📋 Rooms: ${data.length} | Lobby in list: ${hasLobby ? '✅' : '❌'}`);
    
    setRooms(data);
    setLoading(false);
  }

  async function loadMessages(roomId: string) {
    setMessages([]);
    const data = await listMessages(roomId);
    setMessages(data);
    
    // Auto-scroll to bottom on initial load
    setTimeout(() => scrollToBottom("auto"), 100);
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
    console.log("=== Starting new chat ===");
    console.log("Target member ID:", memberId);
    console.log("Current user:", member);
    console.log("Is authenticated:", member !== null);
    
    // CRITICAL: Check authentication first
    if (!member) {
      toast({
        title: "Sila Login Dahulu",
        description: "Session anda telah tamat. Sila login semula.",
        variant: "destructive",
      });
      router.push("/login");
      return;
    }
    
    setCreatingChat(true);
    
    try {
      const roomId = await getOrCreateDirectChat(memberId);
      console.log("Got room ID:", roomId);
      
      if (!roomId) {
        console.error("Failed to create/get chat room - roomId is null");
        
        toast({
          title: "Tidak Dapat Membuat Chat",
          description: "Session mungkin telah tamat. Sila refresh page dan cuba lagi.",
          variant: "destructive",
        });
        setCreatingChat(false);
        return;
      }

      console.log("Fetching room details for:", roomId);
      const roomDetails = await getChatRoom(roomId);
      
      if (!roomDetails) {
        console.error("Room created but failed to fetch details");
        toast({
          title: "Chat Dibuat",
          description: "Chat telah dibuat tetapi tidak dapat dipaparkan. Sila refresh page.",
          variant: "destructive",
        });
        setCreatingChat(false);
        return;
      }

      console.log("✅ Chat loaded successfully:", roomDetails);
      setSelectedRoom(roomDetails);
      setShowNewChat(false);
      
      // Reload rooms list to include new chat
      void loadRooms();
      
      toast({
        title: "Chat Berjaya Dibuat! 🎉",
        description: `Anda kini boleh chat dengan ${getRoomName(roomDetails)}`,
      });
    } catch (error) {
      console.error("Unexpected error in handleStartChat:", error);
      toast({
        title: "Error Tidak Dijangka",
        description: "Sila refresh page dan cuba lagi.",
        variant: "destructive",
      });
    } finally {
      setCreatingChat(false);
    }
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

  // Show loading while auth is checking
  if (authLoading) {
    return (
      <PageAccessGuard pagePath="/member/chat" requireAuth={true}>
        <MemberLayout>
          <SEO title="Chat - AMBC Club" />
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600 mx-auto mb-4"></div>
              <p className="text-muted-foreground">
                Loading chats...
              </p>
            </div>
          </div>
        </MemberLayout>
      </PageAccessGuard>
    );
  }

  if (loading) {
    return (
      <PageAccessGuard pagePath="/member/chat" requireAuth={true}>
        <MemberLayout>
          <SEO title="Chat - AMBC Club" />
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600 mx-auto mb-4"></div>
              <p className="text-muted-foreground">
                Loading chats...
              </p>
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
        <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50 dark:from-gray-900 dark:to-gray-800">
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
                                disabled={creatingChat}
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
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-sm truncate">{getRoomName(room)}</h3>
                                {room.name === "Lobby AMBC Club" && (
                                  <Badge variant="secondary" className="text-xs bg-gradient-to-r from-amber-400 to-orange-400 text-white">
                                    🌟 Public
                                  </Badge>
                                )}
                              </div>
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

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={messagesContainerRef}>
                  {messages.map((msg) => {
                    const isMine = msg.sender_id === member?.id;
                    const senderName = msg.sender?.full_name || "Unknown";

                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex gap-3",
                          isMine ? "flex-row-reverse" : "flex-row"
                        )}
                      >
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback className="text-xs">
                            {senderName[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={cn(
                            "flex flex-col gap-1 max-w-[70%]",
                            isMine ? "items-end" : "items-start"
                          )}
                        >
                          <span className="text-xs text-muted-foreground">
                            {senderName}
                          </span>
                          <div
                            className={cn(
                              "rounded-lg px-4 py-2",
                              isMine
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            )}
                          >
                            <p className="text-sm">{msg.message}</p>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(msg.created_at).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                  
                  {/* Scroll to Bottom Button */}
                  {showScrollButton && (
                    <button
                      onClick={() => {
                        scrollToBottom("smooth");
                        setUnreadCount(0);
                      }}
                      className="fixed bottom-24 right-6 bg-primary text-primary-foreground rounded-full p-3 shadow-lg hover:scale-110 transition-transform z-10"
                      aria-label="Scroll to bottom"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m18 15-6-6-6 6"/>
                      </svg>
                      {unreadCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                    </button>
                  )}
                </div>

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