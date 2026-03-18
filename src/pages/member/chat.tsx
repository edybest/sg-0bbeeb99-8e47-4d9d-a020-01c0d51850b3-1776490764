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
import { supabase } from "@/integrations/supabase/client";
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
  type ChatParticipant,
  type ChatRoomSummary,
} from "@/services/chatService";
import { cn } from "@/lib/utils";
import { useMemberDebug } from "@/hooks/useMemberDebug";
import { MemberDebugPanel } from "@/components/member/MemberDebugPanel";

export default function ChatPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { member, loading: authLoading } = useAuth(true, false);
  const { debugEnabled } = useMemberDebug();
  
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const messagesContainerRef = React.useRef<HTMLDivElement>(null);

  const [rooms, setRooms] = useState<ChatRoomSummary[]>([]);
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
  
  // NEW: Debug state - now toggleable
  const [debugInfo, setDebugInfo] = useState<{
    step: string;
    sessionInfo: any;
    memberInfo: any;
    queryResults: any;
    errors: string[];
    timestamp: string;
  }>({
    step: 'initializing',
    sessionInfo: null,
    memberInfo: null,
    queryResults: null,
    errors: [],
    timestamp: new Date().toISOString()
  });
  const [showDebugPanel, setShowDebugPanel] = useState(false); // Changed to false by default

  console.log("🎨 [ChatPage] Render:", { 
    hasMember: !!member, 
    memberId: member?.id,
    memberEmail: member?.email,
    authLoading,
    roomsCount: rooms.length 
  });

  // Initialize
  useEffect(() => {
    console.log("🎨 [ChatPage] Init useEffect triggered. authLoading:", authLoading, "memberId:", member?.id);
    
    if (authLoading) return;
    if (!member?.id) {
      console.log("🎨 [ChatPage] No member ID yet, skipping initialization");
      setLoading(false);
      return;
    }

    async function init() {
      try {
        console.log("🎨 [ChatPage] Calling ensureLobbyRoom...");
        const lobbyId = await ensureLobbyRoom();
        console.log("🎨 [ChatPage] ensureLobbyRoom result:", lobbyId);
        
        console.log("🎨 [ChatPage] Calling loadRooms...");
        await loadRooms();
        console.log("🎨 [ChatPage] loadRooms completed");
      } catch (error) {
        console.error("❌ [ChatPage] Init error:", error);
        setLoading(false);
      }
    }
    init();
  }, [authLoading, member?.id]);

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
    console.log("🎨 [ChatPage] loadRooms: Starting...");
    setLoading(true);
    
    try {
      // Step 1: Get session
      setDebugInfo(prev => ({ ...prev, step: 'getting_session', timestamp: new Date().toISOString() }));
      const { data: session, error: sessionError } = await supabase.auth.getSession();
      
      setDebugInfo(prev => ({
        ...prev,
        step: 'session_retrieved',
        sessionInfo: {
          hasSession: !!session.session,
          userId: session.session?.user?.id,
          email: session.session?.user?.email,
          error: sessionError?.message
        },
        errors: sessionError ? [...prev.errors, `Session Error: ${sessionError.message}`] : prev.errors,
        timestamp: new Date().toISOString()
      }));

      if (!session.session) {
        setDebugInfo(prev => ({ 
          ...prev, 
          step: 'no_session', 
          errors: [...prev.errors, 'No active session found'],
          timestamp: new Date().toISOString()
        }));
        setRooms([]);
        setLoading(false);
        return;
      }

      // Step 2: Get member
      setDebugInfo(prev => ({ ...prev, step: 'getting_member', timestamp: new Date().toISOString() }));
      const { data: memberData, error: memberError } = await supabase
        .from("members")
        .select("id, full_name, user_id")
        .eq("user_id", session.session.user.id)
        .maybeSingle();

      setDebugInfo(prev => ({
        ...prev,
        step: 'member_retrieved',
        memberInfo: {
          memberId: memberData?.id,
          memberName: memberData?.full_name,
          memberUserId: memberData?.user_id,
          error: memberError?.message
        },
        errors: memberError ? [...prev.errors, `Member Error: ${memberError.message}`] : prev.errors,
        timestamp: new Date().toISOString()
      }));

      if (!memberData || memberError) {
        setDebugInfo(prev => ({ 
          ...prev, 
          step: 'no_member', 
          errors: [...prev.errors, 'Member not found for this user'],
          timestamp: new Date().toISOString()
        }));
        setRooms([]);
        setLoading(false);
        return;
      }

      // Step 3: Query chat rooms
      setDebugInfo(prev => ({ ...prev, step: 'querying_rooms', timestamp: new Date().toISOString() }));
      const { data: participantsData, error: queryError } = await supabase
        .from("chat_participants")
        .select(`
          room_id,
          chat_rooms!inner (
            id,
            name,
            type,
            last_message_at
          )
        `)
        .eq("member_id", memberData.id);

      setDebugInfo(prev => ({
        ...prev,
        step: 'rooms_queried',
        queryResults: {
          participantsCount: participantsData?.length || 0,
          rawData: participantsData,
          error: queryError?.message
        },
        errors: queryError ? [...prev.errors, `Query Error: ${queryError.message}`] : prev.errors,
        timestamp: new Date().toISOString()
      }));

      if (queryError || !participantsData) {
        setDebugInfo(prev => ({ 
          ...prev, 
          step: 'query_failed',
          timestamp: new Date().toISOString()
        }));
        setRooms([]);
        setLoading(false);
        return;
      }

      // Step 4: Process results
      setDebugInfo(prev => ({ ...prev, step: 'processing_results', timestamp: new Date().toISOString() }));
      
      const roomsMap = new Map<string, ChatRoomSummary>();
      for (const row of participantsData) {
        const room = row.chat_rooms;
        if (!room || roomsMap.has(room.id)) continue;

        let displayName = room.name;

        if (room.type === "direct" && !displayName) {
          const { data: participants } = await supabase
            .from("chat_participants")
            .select("member_id, members!chat_participants_member_id_fkey(full_name)")
            .eq("room_id", room.id)
            .neq("member_id", memberData.id)
            .limit(1)
            .maybeSingle();

          if (participants?.members) {
            displayName = (participants.members as { full_name: string }).full_name;
          }
        }

        roomsMap.set(room.id, {
          id: room.id,
          name: displayName || (room.type === "direct" ? "Direct Chat" : "Untitled"),
          type: room.type,
          last_message_at: room.last_message_at,
        });
      }

      const processedRooms = Array.from(roomsMap.values());
      processedRooms.sort((a, b) => {
        if (a.type === "lobby" && b.type !== "lobby") return -1;
        if (a.type !== "lobby" && b.type === "lobby") return 1;
        if (a.last_message_at && b.last_message_at) {
          return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
        }
        if (a.last_message_at) return -1;
        if (b.last_message_at) return 1;
        return 0;
      });

      setDebugInfo(prev => ({
        ...prev,
        step: 'complete',
        queryResults: {
          ...prev.queryResults,
          processedRoomsCount: processedRooms.length,
          roomsList: processedRooms.map(r => ({ id: r.id, name: r.name, type: r.type }))
        },
        timestamp: new Date().toISOString()
      }));

      setRooms(processedRooms);
    } catch (error: any) {
      setDebugInfo(prev => ({
        ...prev,
        step: 'exception',
        errors: [...prev.errors, `Exception: ${error?.message || String(error)}`],
        timestamp: new Date().toISOString()
      }));
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(roomId: string) {
    console.log("💬 [loadMessages] Loading messages for room:", roomId);
    
    try {
      const data = await listMessages(roomId);
      console.log("💬 [loadMessages] Got messages:", data.length);
      setMessages(data);
      setTimeout(() => scrollToBottom("auto"), 100);
    } catch (error) {
      console.error("❌ [loadMessages] Error:", error);
      toast({ 
        title: "Error", 
        description: "Gagal memuat mesej. Cuba refresh halaman.", 
        variant: "destructive" 
      });
      setMessages([]);
    }
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

  async function handleSelectRoom(room: ChatRoomSummary) {
    console.log("🎯 [handleSelectRoom] Selecting room:", room);
    
    try {
      const full = await getChatRoom(room.id);
      console.log("🎯 [handleSelectRoom] Got full room data:", full);
      
      if (full) {
        setSelectedRoom(full);
        console.log("🎯 [handleSelectRoom] Loading messages for room:", full.id);
        await loadMessages(full.id);
        await markMessagesAsRead(full.id);
      } else {
        console.error("❌ [handleSelectRoom] Failed to get full room data");
        
        // Check browser console for detailed error logs
        console.error("❌ Please check the console logs above for detailed error information");
        
        toast({ 
          title: "Error", 
          description: "Gagal memuat maklumat room. Sila check browser console (F12) untuk maklumat lanjut.", 
          variant: "destructive" 
        });
      }
    } catch (error) {
      console.error("❌ [handleSelectRoom] Error:", error);
      toast({ 
        title: "Error", 
        description: `Ada masalah: ${error instanceof Error ? error.message : String(error)}`, 
        variant: "destructive" 
      });
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

  function getSidebarRoomName(room: ChatRoomSummary) {
    if (room.type === "lobby") return "Lobby AMBC Club";
    if (room.name.toLowerCase().includes("lobby")) return room.name;
    return room.name || "Chat";
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
          {debugEnabled && (
            <MemberDebugPanel
              memberInfo={{
                id: member?.id ?? null,
                email: (member as any)?.email ?? null,
                username: (member as any)?.username ?? null,
                isAdmin: member?.is_admin ?? false,
              }}
              extra={{ phase: "loading" }}
            />
          )}
        </MemberLayout>
      </PageAccessGuard>
    );
  }

  const lobbyExists = rooms.some((r) => r.type === "lobby" || r.name.toLowerCase().includes("lobby"));

  return (
    <PageAccessGuard pagePath="/member/chat" requireAuth={true}>
      <MemberLayout>
        <SEO title="Chat - AMBC Club" />
        
        {/* FLOATING DEBUG TOGGLE BUTTON */}
        {debugEnabled && (
          <button
            onClick={() => setShowDebugPanel(!showDebugPanel)}
            className="fixed bottom-20 right-4 z-50 bg-yellow-500 hover:bg-yellow-600 text-white p-3 rounded-full shadow-lg transition-all duration-200 flex items-center gap-2"
            title={showDebugPanel ? "Hide Debug Panel" : "Show Debug Panel"}
          >
            <AlertCircle className="h-5 w-5" />
            {!showDebugPanel && <span className="text-xs font-semibold">Debug</span>}
          </button>
        )}

        {/* DEBUG PANEL - Now toggleable */}
        {debugEnabled && showDebugPanel && (
          <div className="fixed top-16 left-0 right-0 z-50 bg-yellow-50 border-b-2 border-yellow-400 shadow-lg max-h-[40vh] overflow-auto">
            <div className="max-w-7xl mx-auto p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <h3 className="font-bold text-yellow-900">🔍 Debug Panel - Chat Diagnostics</h3>
                </div>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setShowDebugPanel(false)}
                  className="text-yellow-700 hover:bg-yellow-100"
                >
                  Hide
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {/* Current Step */}
                <div className="bg-white p-3 rounded border border-yellow-200">
                  <h4 className="font-semibold text-yellow-900 mb-2">📍 Current Step</h4>
                  <p className="font-mono text-xs bg-gray-100 p-2 rounded">{debugInfo.step}</p>
                  <p className="text-xs text-gray-500 mt-1">{new Date(debugInfo.timestamp).toLocaleTimeString()}</p>
                </div>

                {/* Session Info */}
                <div className="bg-white p-3 rounded border border-yellow-200">
                  <h4 className="font-semibold text-yellow-900 mb-2">🔐 Session Info</h4>
                  {debugInfo.sessionInfo ? (
                    <div className="space-y-1">
                      <p className="text-xs"><span className="font-semibold">Has Session:</span> {debugInfo.sessionInfo.hasSession ? '✅ Yes' : '❌ No'}</p>
                      <p className="text-xs"><span className="font-semibold">User ID:</span> <span className="font-mono text-[10px]">{debugInfo.sessionInfo.userId || 'N/A'}</span></p>
                      <p className="text-xs"><span className="font-semibold">Email:</span> {debugInfo.sessionInfo.email || 'N/A'}</p>
                      {debugInfo.sessionInfo.error && (
                        <p className="text-xs text-red-600">❌ {debugInfo.sessionInfo.error}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">No session data yet...</p>
                  )}
                </div>

                {/* Member Info */}
                <div className="bg-white p-3 rounded border border-yellow-200">
                  <h4 className="font-semibold text-yellow-900 mb-2">👤 Member Info</h4>
                  {debugInfo.memberInfo ? (
                    <div className="space-y-1">
                      <p className="text-xs"><span className="font-semibold">Member ID:</span> <span className="font-mono text-[10px]">{debugInfo.memberInfo.memberId || '❌ Not Found'}</span></p>
                      <p className="text-xs"><span className="font-semibold">Name:</span> {debugInfo.memberInfo.memberName || 'N/A'}</p>
                      <p className="text-xs"><span className="font-semibold">User ID Match:</span> <span className="font-mono text-[10px]">{debugInfo.memberInfo.memberUserId || 'N/A'}</span></p>
                      {debugInfo.memberInfo.error && (
                        <p className="text-xs text-red-600">❌ {debugInfo.memberInfo.error}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">No member data yet...</p>
                  )}
                </div>

                {/* Query Results */}
                <div className="bg-white p-3 rounded border border-yellow-200">
                  <h4 className="font-semibold text-yellow-900 mb-2">💬 Query Results</h4>
                  {debugInfo.queryResults ? (
                    <div className="space-y-1">
                      <p className="text-xs"><span className="font-semibold">Participants Found:</span> {debugInfo.queryResults.participantsCount || 0}</p>
                      <p className="text-xs"><span className="font-semibold">Processed Rooms:</span> {debugInfo.queryResults.processedRoomsCount || 0}</p>
                      {debugInfo.queryResults.roomsList && debugInfo.queryResults.roomsList.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-semibold mb-1">Rooms List:</p>
                          {debugInfo.queryResults.roomsList.map((room: any) => (
                            <p key={room.id} className="text-[10px] font-mono bg-gray-50 p-1 rounded mb-1">
                              {room.type} - {room.name}
                            </p>
                          ))}
                        </div>
                      )}
                      {debugInfo.queryResults.error && (
                        <p className="text-xs text-red-600">❌ {debugInfo.queryResults.error}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">No query data yet...</p>
                  )}
                </div>
              </div>

              {/* Errors Section */}
              {debugInfo.errors.length > 0 && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded p-3">
                  <h4 className="font-semibold text-red-900 mb-2">⚠️ Errors ({debugInfo.errors.length})</h4>
                  <div className="space-y-1">
                    {debugInfo.errors.map((error, idx) => (
                      <p key={idx} className="text-xs text-red-700 font-mono">• {error}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-4 flex gap-2">
                <Button 
                  size="sm" 
                  onClick={() => loadRooms()}
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  🔄 Reload Rooms
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setDebugInfo({
                    step: 'reset',
                    sessionInfo: null,
                    memberInfo: null,
                    queryResults: null,
                    errors: [],
                    timestamp: new Date().toISOString()
                  })}
                >
                  Clear Debug
                </Button>
              </div>
            </div>
          </div>
        )}

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
                    onClick={() => void handleSelectRoom(room)}
                    className={cn(
                      "w-full p-4 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-800 transition-colors text-left",
                      selectedRoom?.id === room.id && "bg-rose-50 dark:bg-gray-700"
                    )}
                  >
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      <AvatarFallback className="bg-rose-100 text-rose-600">
                        {room.type !== "direct" ? <Users className="h-5 w-5" /> : getSidebarRoomName(room)[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <h3 className="font-semibold truncate">{getSidebarRoomName(room)}</h3>
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {room.last_message_at ? "Ada mesej sebelum ini" : "Tiada mesej"}
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
        {debugEnabled && (
          <MemberDebugPanel
            memberInfo={{
              id: member?.id ?? undefined,
              email: member?.email ?? undefined,
              username: (member as any)?.username ?? undefined,
              isAdmin: (member as any)?.is_admin ?? undefined,
            }}
            extra={{
              roomsCount: rooms.length,
              roomNames: rooms.map((r) => r.name),
              lobbyExists,
              hasSelectedRoom: !!selectedRoom,
              selectedRoomId: selectedRoom?.id ?? null,
            }}
          />
        )}
      </MemberLayout>
    </PageAccessGuard>
  );
}