import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  Loader2,
  Trophy, 
  Calendar, 
  Users, 
  Target, 
  Shuffle, 
  Upload, 
  FileUp,
  Sparkles,
  Medal,
  Crown,
  Star,
  Plus,
  Trash2,
  RefreshCw,
  ExternalLink,
  Share2,
  Copy,
  Check,
  ArrowLeft,
  X,
  Lock,
  Unlock,
  UserPlus,
  Edit2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SEO } from "@/components/SEO";
import { useToast } from "@/hooks/use-toast";
import { useMemberDebug } from "@/hooks/useMemberDebug";
import { TournamentCard } from "@/components/mini-blok/TournamentCard";
import { PublicSharedView } from "@/components/mini-blok/PublicSharedView";
import { 
  MINI_BLOK_FORMATS,
  calculatePayouts,
  GAME_COLORS,
  INITIAL_PLAYER_FORM,
  calculatePlayerStats,
  generateShareUrl,
  generateShareTokenUrl,
  generateShareText,
  type MiniBlokTournament,
  type MiniBlokPlayer,
  type MiniBlokWithPlayers,
  type MiniBlokPublicShared,
  type PlayerForm
} from "@/components/mini-blok/constants";
import { 
  getMiniBlokEntries,
  getMiniBlokById,
  createMiniBlok,
  updateMiniBlok,
  deleteMiniBlok,
  addPlayer,
  updatePlayer,
  deletePlayer,
  shareAccess,
  revokeAccess,
  generateShareToken,
  revokeShareToken,
  getMiniBlokSharedByToken
} from "@/services/miniBlokService";
import { MemberLayout } from "@/components/member/MemberLayout";
import { MemberDebugPanel } from "@/components/member/MemberDebugPanel";
import { PageAccessGuard } from "@/components/PageAccessGuard";

export default function MiniBlokPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { member, loading: authLoading } = useAuth();
  const { debugEnabled } = useMemberDebug();

  // CRITICAL FIX: Detect share mode from query parameter
  const shareToken = (router.query.share as string) || null;
  const entryIdFromQuery = (router.query.id as string) || null;
  const isPublicSharedMode = !!shareToken;
  const isRouterReady = router.isReady;

  // Data states
  const [entries, setEntries] = useState<MiniBlokWithPlayers[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Debug state
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState({
    entriesCount: 0,
    loadingTime: 0,
    publicMode: false,
    token: "",
    filtersApplied: {}
  });

  // UI states
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [ownershipFilter, setOwnershipFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date-desc");
  const [expandedEntryPlayers, setExpandedEntryPlayers] = useState<Record<string, boolean>>({});
  const [expandedEntryPlayerScores, setExpandedEntryPlayerScores] = useState<Record<string, Record<string, boolean>>>({});
  const [expandedScores, setExpandedScores] = useState<Record<string, boolean>>({});
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  const [availableMembers, setAvailableMembers] = useState<any[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [showPlayerForm, setShowPlayerForm] = useState(false);

  const [tournamentForm, setTournamentForm] = useState({
    title: "",
    location: "Daiman Bowl",
    date: new Date().toISOString().split("T")[0],
    total_games: 5,
  });

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showManageDialog, setShowManageDialog] = useState(false);
  const [showShareAccessDialog, setShowShareAccessDialog] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<MiniBlokWithPlayers | null>(null);
  const [deleteConfirmEntry, setDeleteConfirmEntry] = useState<string | null>(null);
  const [deleteConfirmPlayer, setDeleteConfirmPlayer] = useState<string | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<any | null>(null);
  const [playerForm, setPlayerForm] = useState<PlayerForm>(INITIAL_PLAYER_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [shareEntry, setShareEntry] = useState<MiniBlokWithPlayers | null>(null);
  const [shareMode, setShareMode] = useState<"public" | "editable">("public");
  const [shareAccessEntry, setShareAccessEntry] = useState<MiniBlokWithPlayers | null>(null);
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedEditUrl, setCopiedEditUrl] = useState(false);
  const [publicShared, setPublicShared] = useState<MiniBlokPublicShared | null>(null);

  // CRITICAL FIX: Load data based on mode
  useEffect(() => {
    if (!isRouterReady) return;
    
    // Public shared mode - load shared tournament for guests
    if (isPublicSharedMode && shareToken) {
      console.log("🌐 Public share mode detected, loading shared tournament...", { shareToken });
      loadPublicShared(shareToken);
      return; // Don't load regular entries
    }
    
    // Regular mode - wait for auth then load user's tournaments
    if (authLoading) {
      console.log("⏳ Waiting for auth to complete...");
      return;
    }
    
    console.log("👤 Loading user tournaments...", { memberId: member?.id });
    loadEntries();
  }, [isRouterReady, isPublicSharedMode, shareToken, authLoading, member?.id]);

  useEffect(() => {
    if (!isRouterReady) return;
    if (!isPublicSharedMode) return;
    loadPublicShared(shareToken!);
  }, [isRouterReady, isPublicSharedMode, shareToken]);

  async function loadPublicShared(token: string) {
    setLoading(true);
    try {
      const shared = await getMiniBlokSharedByToken(token);
      setPublicShared(shared);
    } catch (error) {
      console.error("Error loading public shared:", error);
      toast({
        title: "Error",
        description: "Unable to load shared tournament",
        variant: "destructive",
      });
      setPublicShared(null);
    } finally {
      setLoading(false);
    }
  }

  // Optimize: Skip expensive filtering for public shared mode
  const filteredAndSortedEntries = useMemo(() => {
    // Skip filtering for public shared mode - no entries to show
    if (isPublicSharedMode) return [];
    
    // Skip filtering if no entries
    if (entries.length === 0) return [];
    
    return entries
      .filter((entry) => {
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchTitle = entry.title?.toLowerCase().includes(query);
          const matchLocation = entry.location?.toLowerCase().includes(query);
          if (!matchTitle && !matchLocation) return false;
        }

        if (dateFilter !== "all") {
          const entryDate = new Date(entry.date);
          const now = new Date();

          if (dateFilter === "week") {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            if (entryDate < weekAgo) return false;
          } else if (dateFilter === "month") {
            const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            if (entryDate < monthAgo) return false;
          } else if (dateFilter === "year") {
            const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
            if (entryDate < yearAgo) return false;
          }
        }

        if (ownershipFilter === "mine") {
          if (entry.owner_id !== member?.id) return false;
        } else if (ownershipFilter === "shared") {
          if (entry.owner_id === member?.id) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "date-desc") {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        } else if (sortBy === "date-asc") {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        } else if (sortBy === "title") {
          return (a.title || "").localeCompare(b.title || "");
        }
        return 0;
      });
  }, [entries, searchQuery, dateFilter, ownershipFilter, sortBy, member?.id, isPublicSharedMode]);

  useEffect(() => {
    setDebugInfo(prev => ({
      ...prev,
      filtersApplied: {
        search: searchQuery,
        date: dateFilter,
        ownership: ownershipFilter,
        sort: sortBy
      }
    }));
  }, [searchQuery, dateFilter, ownershipFilter, sortBy]);

  async function loadEntries(silent = false) {
    const startTime = Date.now();
    try {
      if (!silent) setLoading(true);
      const data = await getMiniBlokEntries(member?.id);
      setEntries(data || []);
      
      setDebugInfo(prev => ({
        ...prev,
        entriesCount: data?.length || 0,
        loadingTime: Date.now() - startTime,
        publicMode: isPublicSharedMode,
        token: shareToken || ""
      }));
    } catch (error) {
      console.error("Error loading mini blok entries:", error);
      toast({
        title: "Error",
        description: "Failed to load entries",
        variant: "destructive",
      });
    } finally {
      if (!silent) setLoading(false);
    }
  }

  function highlightEntry(entryId: string) {
    setTimeout(() => {
      const element = document.getElementById(`entry-${entryId}`);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
      element?.classList.add("ring-4", "ring-primary", "ring-offset-4");
      setTimeout(() => {
        element?.classList.remove("ring-4", "ring-primary", "ring-offset-4");
      }, 3000);
    }, 400);
  }

  useEffect(() => {
    if (isPublicSharedMode) return;

    if (entryIdFromQuery && member?.id) {
      loadSharedEntry(entryIdFromQuery);
    }
  }, [entryIdFromQuery, member?.id, isPublicSharedMode]);

  async function loadSharedEntry(entryId: string) {
    try {
      const entry = await getMiniBlokById(entryId, member?.id);

      if (!entry) {
        toast({
          title: "Tournament not found",
          description: "Link may be invalid or tournament deleted.",
          variant: "destructive",
        });
        return;
      }

      if (member?.id && !entry.can_edit) {
        toast({
          title: "No access",
          description: "Tournament not shared with your account.",
          variant: "destructive",
        });
        return;
      }

      setEntries((prev) => {
        const already = prev.some((e) => e.id === entry.id);
        if (already) return prev;
        return [entry, ...prev];
      });

      highlightEntry(entryId);
    } catch (error) {
      console.error("Error loading shared entry:", error);
      toast({
        title: "Error",
        description: "Failed to load shared entry",
        variant: "destructive",
      });
    }
  }

  async function handleRevokePublicShare() {
    if (!shareToken) return;

    try {
      setSubmitting(true);
      await revokeShareToken(shareToken);
      toast({
        title: "Success",
        description: "Share link revoked.",
      });

      router.replace("/member/mini-blok");
    } catch (error) {
      console.error("Error revoking share token:", error);
      toast({
        title: "Error",
        description: "Failed to revoke share link.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateTournament() {
    if (!member) {
      toast({
        title: "Authentication Required",
        description: "Please login to create tournaments",
        variant: "destructive",
      });
      return;
    }

    if (!tournamentForm.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Tournament title is required",
        variant: "destructive",
      });
      return;
    }

    if (tournamentForm.total_games < 1 || tournamentForm.total_games > 20) {
      toast({
        title: "Validation Error",
        description: "Total games must be between 1 and 20",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      await createMiniBlok({
        title: tournamentForm.title,
        location: tournamentForm.location,
        date: tournamentForm.date,
        num_games: tournamentForm.total_games,
        owner_id: member.id,
      });

      toast({
        title: "Success",
        description: "Tournament created successfully",
      });

      setShowCreateDialog(false);
      setTournamentForm({
        title: "",
        location: "Daiman Bowl",
        date: new Date().toISOString().split("T")[0],
        total_games: 5,
      });
      await loadEntries(true);
    } catch (error) {
      console.error("Error creating tournament:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create tournament",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateTournament() {
    if (!selectedEntry) return;

    try {
      setSubmitting(true);
      await updateMiniBlok(selectedEntry.id, {
        title: tournamentForm.title,
        location: tournamentForm.location,
        date: tournamentForm.date,
        num_games: tournamentForm.total_games,
      });

      toast({
        title: "Success",
        description: "Tournament updated successfully",
      });

      await loadEntries(true);
      const updated = await getMiniBlokById(selectedEntry.id, member?.id);
      if (updated) setSelectedEntry(updated);
    } catch (error) {
      console.error("Error updating tournament:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update tournament",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteTournament(id: string) {
    try {
      await deleteMiniBlok(id);
      toast({
        title: "Success",
        description: "Tournament deleted successfully",
      });
      setDeleteConfirmEntry(null);
      setShowManageDialog(false);
      setSelectedEntry(null);
      await loadEntries(true);
    } catch (error) {
      console.error("Error deleting tournament:", error);
      toast({
        title: "Error",
        description: "Failed to delete tournament",
        variant: "destructive",
      });
    }
  }

  function openManageDialog(entry: MiniBlokWithPlayers) {
    setSelectedEntry(entry);
    setTournamentForm({
      title: entry.title || "",
      location: entry.location || "",
      date: entry.date || new Date().toISOString().split("T")[0],
      total_games: entry.num_games || 5,
    });
    setShowManageDialog(true);
  }

  function openAddPlayerDialog() {
    if (!selectedEntry) return;
    if (selectedEntry.players.length >= 48) {
      toast({
        title: "Player Limit Reached",
        description: "Maximum 48 players per tournament",
        variant: "destructive",
      });
      return;
    }
    setEditingPlayer(null);
    setPlayerForm(INITIAL_PLAYER_FORM);
    setShowPlayerForm(true);
  }

  function openEditPlayerDialog(player: any) {
    setEditingPlayer(player);
    const scores = (player.scores as Record<string, number>) || {};
    const formData: PlayerForm = {
      player_name: player.player_name,
      handicap: player.handicap || 0,
      game_1: scores.game_1 || null,
      game_2: scores.game_2 || null,
      game_3: scores.game_3 || null,
      game_4: scores.game_4 || null,
      game_5: scores.game_5 || null,
      game_6: scores.game_6 || null,
      game_7: scores.game_7 || null,
      game_8: scores.game_8 || null,
      game_9: scores.game_9 || null,
      game_10: scores.game_10 || null,
      game_11: scores.game_11 || null,
      game_12: scores.game_12 || null,
      game_13: scores.game_13 || null,
      game_14: scores.game_14 || null,
      game_15: scores.game_15 || null,
      game_16: scores.game_16 || null,
      game_17: scores.game_17 || null,
      game_18: scores.game_18 || null,
      game_19: scores.game_19 || null,
      game_20: scores.game_20 || null,
    };
    setPlayerForm(formData);
    setShowPlayerForm(true);
  }

  async function handleSavePlayer() {
    if (!selectedEntry) return;

    if (!playerForm.player_name.trim()) {
      toast({
        title: "Validation Error",
        description: "Player name is required",
        variant: "destructive",
      });
      return;
    }

    const scoresObj: Record<string, number> = {};
    const numGames = selectedEntry.num_games || 5;
    for (let i = 1; i <= numGames; i++) {
      const val = playerForm[`game_${i}` as keyof PlayerForm];
      if (typeof val === "number" && val >= 0) {
        scoresObj[`game_${i}`] = val;
      }
    }

    if (Object.keys(scoresObj).length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one game score is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      if (editingPlayer) {
        await updatePlayer(editingPlayer.id, {
          player_name: playerForm.player_name,
          handicap: playerForm.handicap,
          scores: scoresObj,
        });
        toast({
          title: "Success",
          description: "Player updated successfully",
        });
      } else {
        await addPlayer({
          player_name: playerForm.player_name,
          handicap: playerForm.handicap,
          scores: scoresObj,
          mini_blok_id: selectedEntry.id,
        });
        toast({
          title: "Success",
          description: "Player added successfully",
        });
      }

      setPlayerForm(INITIAL_PLAYER_FORM);
      setEditingPlayer(null);
      setShowPlayerForm(false);
      const updated = await getMiniBlokById(selectedEntry.id, member?.id);
      if (updated) setSelectedEntry(updated);
      await loadEntries(true);
    } catch (error) {
      console.error("Error saving player:", error);
      toast({
        title: "Error",
        description: "Failed to save player",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeletePlayer(playerId: string) {
    try {
      await deletePlayer(playerId);
      toast({
        title: "Success",
        description: "Player deleted successfully",
      });
      setDeleteConfirmPlayer(null);
      if (selectedEntry) {
        const updated = await getMiniBlokById(selectedEntry.id, member?.id);
        if (updated) setSelectedEntry(updated);
      }
      await loadEntries(true);
    } catch (error) {
      console.error("Error deleting player:", error);
      toast({
        title: "Error",
        description: "Failed to delete player",
        variant: "destructive",
      });
    }
  }

  async function openShareAccessDialog(entry: MiniBlokWithPlayers) {
    setShareAccessEntry(entry);
    setShowShareAccessDialog(true);

    try {
      const { data: members } = await supabase
        .from("members")
        .select("id, full_name")
        .order("full_name");

      if (members) {
        const filtered = members.filter(
          (m) => m.id !== entry.owner_id &&
            !entry.shared_with.some((s) => s.member_id === m.id)
        );
        setAvailableMembers(filtered);
      }
    } catch (error) {
      console.error("Error loading members:", error);
    }
  }

  async function handleShareAccess() {
    if (!shareAccessEntry || selectedMemberIds.length === 0) return;

    try {
      setSubmitting(true);
      await shareAccess(shareAccessEntry.id, selectedMemberIds);

      toast({
        title: "Success",
        description: `Shared with ${selectedMemberIds.length} member(s)`,
      });

      setShowShareAccessDialog(false);
      setSelectedMemberIds([]);
      await loadEntries(true);

      if (selectedEntry?.id === shareAccessEntry.id) {
        const updated = await getMiniBlokById(shareAccessEntry.id, member?.id);
        if (updated) setSelectedEntry(updated);
      }
    } catch (error) {
      console.error("Error sharing access:", error);
      toast({
        title: "Error",
        description: "Failed to share access",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevokeAccess(entryId: string, memberId: string) {
    try {
      await revokeAccess(entryId, memberId);
      toast({
        title: "Success",
        description: "Access revoked successfully",
      });
      await loadEntries(true);

      if (selectedEntry?.id === entryId) {
        const updated = await getMiniBlokById(entryId, member?.id);
        if (updated) setSelectedEntry(updated);
      }
    } catch (error) {
      console.error("Error revoking access:", error);
      toast({
        title: "Error",
        description: "Failed to revoke access",
        variant: "destructive",
      });
    }
  }

  function handleShare(entry: MiniBlokWithPlayers) {
    setShareEntry(entry);
    setCopiedUrl(false);
    setCopiedEditUrl(false);
  }

  async function handleGenerateToken() {
    if (!shareEntry) return;
    
    try {
      setIsGeneratingToken(true);
      const newToken = await generateShareToken(shareEntry.id);
      
      const updatedEntry = { ...shareEntry, share_token: newToken };
      setShareEntry(updatedEntry);
      
      // Update entry in list to reflect new token
      setEntries(prev => prev.map(e => e.id === updatedEntry.id ? updatedEntry : e));
      
      toast({
        title: "Success",
        description: "Public link generated successfully!",
      });
    } catch (error) {
      console.error("Failed to generate token:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate public link",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingToken(false);
    }
  }

  async function copyShareUrl() {
    if (!shareEntry) return;

    const url =
      shareMode === "editable"
        ? generateShareUrl(shareEntry.id)
        : (shareEntry.share_token ? generateShareTokenUrl(shareEntry.share_token) : "");
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
      toast({
        title: "Copied!",
        description: "Link copied to clipboard",
      });
    } catch (error) {
      console.error("Error copying URL:", error);
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  }

  async function copyEditableLink() {
    if (!shareEntry) return;

    const url = generateShareUrl(shareEntry.id);

    try {
      await navigator.clipboard.writeText(url);
      setCopiedEditUrl(true);
      setTimeout(() => setCopiedEditUrl(false), 2000);
      toast({
        title: "Copied!",
        description: "Editable link copied to clipboard",
      });
    } catch (error) {
      console.error("Error copying editable URL:", error);
      toast({
        title: "Error",
        description: "Failed to copy editable link",
        variant: "destructive",
      });
    }
  }

  function shareToWhatsApp() {
    if (!shareEntry) return;
    const text = generateShareText(shareEntry);
    const url =
      shareMode === "editable"
        ? generateShareUrl(shareEntry.id)
        : (shareEntry.share_token ? generateShareTokenUrl(shareEntry.share_token) : "");
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text + "\n\n" + url)}`;
    window.open(whatsappUrl, "_blank");
  }

  function shareToFacebook() {
    if (!shareEntry) return;
    const url =
      shareMode === "editable"
        ? generateShareUrl(shareEntry.id)
        : (shareEntry.share_token ? generateShareTokenUrl(shareEntry.share_token) : generateShareUrl(shareEntry.id));
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(fbUrl, "_blank");
  }

  function shareToTwitter() {
    if (!shareEntry) return;
    const text = generateShareText(shareEntry);
    const url =
      shareMode === "editable"
        ? generateShareUrl(shareEntry.id)
        : (shareEntry.share_token ? generateShareTokenUrl(shareEntry.share_token) : generateShareUrl(shareEntry.id));
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, "_blank");
  }

  // Show nothing to avoid flashes until Next.js router initializes
  if (!isRouterReady) {
    return null;
  }

  // Show public shared view if token is present
  if (shareToken && publicShared) {
    return <PublicSharedView shared={publicShared} onBack={() => router.replace("/member/mini-blok")} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-sky-600" />
          <p className="text-sky-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (isPublicSharedMode) {
    return (
      <>
        <SEO title="Shared Mini Blok - AMBC CLUB" description="View-only mini blok tournament shared with public" />
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
          <div className="border-b bg-theme-header/90 backdrop-blur sticky top-0 z-40">
            <div className="container mx-auto px-4 py-3 max-w-7xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => router.push('/member/mini-blok')} className="mr-1 h-8 w-8 shrink-0">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="leading-tight">
                  <div className="font-semibold">AMBC CLUB</div>
                  <div className="text-xs text-muted-foreground">Mini Blok Shared</div>
                </div>
              </div>

              {member && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleRevokePublicShare}
                  disabled={submitting}
                >
                  {submitting ? "Revoking..." : "Revoke Link"}
                </Button>
              )}
            </div>
          </div>

          {publicShared ? (
            <PublicSharedView
              shared={publicShared}
              onBack={() => router.replace("/member/mini-blok")}
            />
          ) : (
            <div className="container mx-auto px-4 py-10 max-w-3xl">
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No players yet
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </>
    );
  }

  // Only block the main dashboard view if auth is still loading or entries are loading
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-sky-600" />
      </div>
    );
  }

  return (
    <PageAccessGuard
      pagePath="/member/mini-blok"
      requireAuth={true}
      renderLoading={() => null}
    >
      <MemberLayout>
      <SEO title="Mini Blok - AMBC Club" description="Sistem rekod mini blok" />
      <div className="min-h-screen bg-rose-50 flex flex-col">

        {/* Hero Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-rose-400 via-pink-500 to-purple-500 pt-8 pb-12 sm:pt-12 sm:pb-16 px-4">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_50%)]"></div>
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.1),transparent_50%)]"></div>
          
          <div className="relative container mx-auto max-w-6xl z-10">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col md:flex-row gap-6 items-center justify-between"
            >
              <div className="text-white text-center md:text-left flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-sm font-medium mb-4">
                  <Crown className="w-4 h-4 text-yellow-300" />
                  <span>Liga Mini Blok</span>
                </div>
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-4 tracking-tight drop-shadow-md">
                  Liga Mini Blok 🎳
                </h1>
                <p className="text-pink-50 text-lg max-w-xl mx-auto md:mx-0">
                  Sistem perlawanan Mini Blok (3 Game). Cipta, kongsi, dan bersaing bersama rakan-rakan!
                </p>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
          <div className="border-b bg-theme-header/90 backdrop-blur sticky top-0 z-40">
            <div className="container mx-auto px-4 py-3 max-w-7xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="leading-tight">
                  <div className="font-semibold">AMBC CLUB</div>
                  <div className="text-xs text-muted-foreground">Mini Blok</div>
                </div>
              </div>

              {member && (
                <Button onClick={() => setShowCreateDialog(true)} size="lg" className="w-full sm:w-auto">
                  <Plus className="h-5 w-5 mr-2" />
                  Create Tournament
                </Button>
              )}
            </div>
          </div>

          {/* Search and Filters - Only show for logged-in users viewing their tournaments */}
          {!isPublicSharedMode && member && entries.length > 0 && (
            <div className="bg-card border rounded-lg p-4 mb-6 space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Label htmlFor="search" className="sr-only">Search</Label>
                  <Input
                    id="search"
                    placeholder="Search by title or location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Date" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="week">Past Week</SelectItem>
                      <SelectItem value="month">Past Month</SelectItem>
                      <SelectItem value="year">Past Year</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={ownershipFilter} onValueChange={setOwnershipFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Ownership" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tournaments</SelectItem>
                      <SelectItem value="mine">My Tournaments</SelectItem>
                      <SelectItem value="shared">Shared With Me</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date-desc">Newest First</SelectItem>
                      <SelectItem value="date-asc">Oldest First</SelectItem>
                      <SelectItem value="title">Title (A-Z)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {entries.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Trophy className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No tournaments yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {member
                    ? "Start by creating your first mini blok tournament"
                    : "Login to create tournaments"}
                </p>
                {member && (
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Tournament
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : filteredAndSortedEntries.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Trophy className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No tournaments found</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Try adjusting your filters
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setDateFilter("all");
                    setOwnershipFilter("all");
                    setSortBy("date-desc");
                  }}
                >
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredAndSortedEntries.map((entry) => (
                <TournamentCard
                  key={entry.id}
                  entry={entry}
                  memberId={member?.id}
                  onShare={() => handleShare(entry)}
                  onManage={() => openManageDialog(entry)}
                  onDelete={() => setDeleteConfirmEntry(entry.id)}
                />
              ))}
            </div>
          )}
        </div>

        {debugEnabled && (
          <MemberDebugPanel 
            memberInfo={{
              id: member?.id,
              email: member?.email,
              username: member?.username,
              isAdmin: member?.is_admin
            }}
            extra={debugInfo} 
          />
        )}

        {/* Create Tournament Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Tournament</DialogTitle>
              <DialogDescription>
                Set up a new mini blok tournament
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Tournament Title *</Label>
                <Input
                  id="title"
                  value={tournamentForm.title}
                  onChange={(e) =>
                    setTournamentForm({ ...tournamentForm, title: e.target.value })
                  }
                  placeholder="e.g., Blok Suka Suki"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={tournamentForm.location}
                  onChange={(e) =>
                    setTournamentForm({ ...tournamentForm, location: e.target.value })
                  }
                  placeholder="Daiman Bowl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={tournamentForm.date}
                  onChange={(e) =>
                    setTournamentForm({ ...tournamentForm, date: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="total_games">Total Games (1-20)</Label>
                <Input
                  id="total_games"
                  type="number"
                  min="1"
                  max="20"
                  value={tournamentForm.total_games}
                  onChange={(e) =>
                    setTournamentForm({ ...tournamentForm, total_games: parseInt(e.target.value) || 1 })
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateTournament} disabled={submitting}>
                {submitting ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Manage Tournament Dialog */}
        <Dialog open={showManageDialog} onOpenChange={setShowManageDialog}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Manage Tournament</span>
                <div className="flex gap-2">
                  {selectedEntry?.owner_id === member?.id && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => selectedEntry && openShareAccessDialog(selectedEntry)}
                      >
                        <Unlock className="h-4 w-4 mr-2" />
                        Share Access
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => selectedEntry && setDeleteConfirmEntry(selectedEntry.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </DialogTitle>
            </DialogHeader>

            {selectedEntry && (
              <div className="space-y-6">
                {/* Tournament Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Tournament Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="edit_title">Title *</Label>
                        <Input
                          id="edit_title"
                          value={tournamentForm.title}
                          onChange={(e) =>
                            setTournamentForm({ ...tournamentForm, title: e.target.value })
                          }
                          disabled={!selectedEntry.can_edit}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit_location">Location</Label>
                        <Input
                          id="edit_location"
                          value={tournamentForm.location}
                          onChange={(e) =>
                            setTournamentForm({ ...tournamentForm, location: e.target.value })
                          }
                          disabled={!selectedEntry.can_edit}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit_date">Date</Label>
                        <Input
                          id="edit_date"
                          type="date"
                          value={tournamentForm.date}
                          onChange={(e) =>
                            setTournamentForm({ ...tournamentForm, date: e.target.value })
                          }
                          disabled={!selectedEntry.can_edit}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit_total_games">Total Games (1-20)</Label>
                        <Input
                          id="edit_total_games"
                          type="number"
                          min="1"
                          max="20"
                          value={tournamentForm.total_games}
                          onChange={(e) =>
                            setTournamentForm({ ...tournamentForm, total_games: parseInt(e.target.value) || 1 })
                          }
                          disabled={!selectedEntry.can_edit}
                        />
                      </div>
                    </div>

                    {selectedEntry.can_edit && (
                      <Button onClick={handleUpdateTournament} disabled={submitting}>
                        {submitting ? "Saving..." : "Save Changes"}
                      </Button>
                    )}
                  </CardContent>
                </Card>

                {/* Shared Access */}
                {selectedEntry.owner_id === member?.id && selectedEntry.shared_with.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Shared With</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {selectedEntry.shared_with.map((access) => (
                          <div
                            key={access.id}
                            className="flex items-center justify-between bg-muted/50 rounded-lg p-3"
                          >
                            <div className="flex items-center gap-2">
                              <Lock className="h-4 w-4 text-muted-foreground" />
                              <span>Member ID: {access.member_id.substring(0, 8)}...</span>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRevokeAccess(selectedEntry.id, access.member_id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Players Section */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        Players ({selectedEntry.players.length}/48)
                      </CardTitle>
                      {selectedEntry.can_edit && selectedEntry.players.length < 48 && (
                        <Button size="sm" onClick={openAddPlayerDialog}>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Add Player
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Player Form */}
                    {showPlayerForm && (
                      <Card className="mb-4 border-primary">
                        <CardContent className="pt-6 space-y-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="player_name">Player Name *</Label>
                              <Input
                                id="player_name"
                                value={playerForm.player_name}
                                onChange={(e) =>
                                  setPlayerForm({ ...playerForm, player_name: e.target.value })
                                }
                                placeholder="Enter player name"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="handicap">Handicap</Label>
                              <Input
                                id="handicap"
                                type="number"
                                min="0"
                                value={playerForm.handicap}
                                onChange={(e) =>
                                  setPlayerForm({ ...playerForm, handicap: parseInt(e.target.value) || 0 })
                                }
                              />
                            </div>
                          </div>

                          <div>
                            <Label className="mb-3 block">Game Scores (up to {selectedEntry.num_games} games)</Label>
                            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5">
                              {Array.from({ length: selectedEntry.num_games || 5 }, (_, i) => i + 1).map((gameNum) => (
                                <div key={gameNum} className="space-y-2">
                                  <Label htmlFor={`game_${gameNum}`} className="text-xs">
                                    Game {gameNum}
                                  </Label>
                                  <Input
                                    id={`game_${gameNum}`}
                                    type="number"
                                    min="0"
                                    max="300"
                                    value={playerForm[`game_${gameNum}` as keyof PlayerForm] as number || ""}
                                    onChange={(e) =>
                                      setPlayerForm({
                                        ...playerForm,
                                        [`game_${gameNum}`]: e.target.value ? parseInt(e.target.value) : null,
                                      })
                                    }
                                    placeholder="0"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={handleSavePlayer} disabled={submitting}>
                              {submitting ? "Saving..." : editingPlayer ? "Update Player" : "Add Player"}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setPlayerForm(INITIAL_PLAYER_FORM);
                                setEditingPlayer(null);
                                setShowPlayerForm(false);
                              }}
                              disabled={submitting}
                            >
                              Cancel
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Players Table */}
                    {selectedEntry.players.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No players yet. Add your first player to get started.
                      </div>
                    ) : (
                      <>
                        {/* Mobile View - Expandable Cards */}
                        <div className="md:hidden space-y-3">
                          {selectedEntry.players
                            .sort((a, b) => {
                              const statsA = calculatePlayerStats(a, selectedEntry.num_games || 5);
                              const statsB = calculatePlayerStats(b, selectedEntry.num_games || 5);
                              return statsB.overall_score - statsA.overall_score;
                            })
                            .map((player, idx) => {
                              const stats = calculatePlayerStats(player, selectedEntry.num_games || 5);
                              const scores = (player.scores as Record<string, number>) || {};
                              const isExpanded = expandedScores[player.id];

                              return (
                                <Card key={player.id} className="overflow-hidden">
                                  <div
                                    className="p-4 cursor-pointer"
                                    onClick={() =>
                                      setExpandedScores((prev) => ({
                                        ...prev,
                                        [player.id]: !prev[player.id],
                                      }))
                                    }
                                  >
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center gap-2">
                                        <Badge variant={idx === 0 ? "default" : "secondary"}>
                                          #{idx + 1}
                                        </Badge>
                                        <span className="font-semibold">{player.player_name}</span>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-lg font-bold text-pink-600">
                                          {stats.overall_score}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          Avg: {stats.average}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                      <span>Tap to {isExpanded ? "hide" : "view"} details</span>
                                      <div className="flex gap-2">
                                        {selectedEntry.can_edit && (
                                          <>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                openEditPlayerDialog(player);
                                              }}
                                            >
                                              <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setDeleteConfirmPlayer(player.id);
                                              }}
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {isExpanded && (
                                    <div className="border-t bg-muted/30 p-4 space-y-3">
                                      <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>
                                          <span className="text-muted-foreground">Handicap:</span>
                                          <span className="ml-2 font-semibold">{player.handicap}</span>
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">Total:</span>
                                          <span className="ml-2 font-semibold">{stats.total_score}</span>
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">Average:</span>
                                          <span className="ml-2 font-semibold">{stats.average}</span>
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">Diff:</span>
                                          <span className={`ml-2 font-semibold ${stats.differential > 0 ? "text-green-600" : "text-pink-600"}`}>
                                            {stats.differential > 0 ? "+" : ""}{stats.differential}
                                          </span>
                                        </div>
                                      </div>

                                      <div>
                                        <div className="text-xs text-muted-foreground mb-2">Game Scores:</div>
                                        <div className="flex flex-wrap gap-2">
                                          {Array.from({ length: selectedEntry.num_games || 5 }, (_, i) => {
                                            const score = scores[`game_${i + 1}`] as number | null;
                                            return (
                                              <Badge
                                                key={i}
                                                variant="secondary"
                                                className={score !== null && score > 0 ? `${GAME_COLORS[i]} text-white` : "bg-rose-200"}
                                              >
                                                G{i + 1}: {score !== null && score > 0 ? score : "-"}
                                              </Badge>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </Card>
                              );
                            })}
                        </div>

                        {/* Desktop View - Full Table */}
                        <div className="hidden md:block overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-12">#</TableHead>
                                <TableHead>Player</TableHead>
                                {Array.from({ length: selectedEntry.num_games || 5 }, (_, i) => (
                                  <TableHead key={i} className="text-center">G{i + 1}</TableHead>
                                ))}
                                <TableHead className="text-center">HCP</TableHead>
                                <TableHead className="text-center">Avg</TableHead>
                                <TableHead className="text-center">Total</TableHead>
                                <TableHead className="text-center">Overall</TableHead>
                                <TableHead className="text-center">Diff</TableHead>
                                {selectedEntry.can_edit && <TableHead className="w-24">Actions</TableHead>}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selectedEntry.players
                                .sort((a, b) => {
                                  const statsA = calculatePlayerStats(a, selectedEntry.num_games || 5);
                                  const statsB = calculatePlayerStats(b, selectedEntry.num_games || 5);
                                  return statsB.overall_score - statsA.overall_score;
                                })
                                .map((player, idx) => {
                                  const stats = calculatePlayerStats(player, selectedEntry.num_games || 5);
                                  const scores = (player.scores as Record<string, number>) || {};
                                  return (
                                    <TableRow key={player.id}>
                                      <TableCell>
                                        <Badge variant={idx === 0 ? "default" : "secondary"}>
                                          {idx + 1}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="font-semibold">{player.player_name}</TableCell>
                                      {Array.from({ length: selectedEntry.num_games || 5 }, (_, i) => {
                                        const score = scores[`game_${i + 1}`] as number | null;
                                        return (
                                          <TableCell key={i} className="text-center">
                                            {score !== null && score > 0 ? (
                                              <Badge variant="secondary" className={`${GAME_COLORS[i]} text-white`}>
                                                {score}
                                              </Badge>
                                            ) : (
                                              <span className="text-muted-foreground">-</span>
                                            )}
                                          </TableCell>
                                        );
                                      })}
                                      <TableCell className="text-center">{player.handicap}</TableCell>
                                      <TableCell className="text-center font-semibold">{stats.average}</TableCell>
                                      <TableCell className="text-center">{stats.total_score}</TableCell>
                                      <TableCell className="text-center font-bold text-pink-600">
                                        {stats.overall_score}
                                      </TableCell>
                                      <TableCell className="text-center">
                                        <span className={stats.differential > 0 ? "text-green-600" : "text-pink-600"}>
                                          {stats.differential > 0 ? "+" : ""}{stats.differential}
                                        </span>
                                      </TableCell>
                                      {selectedEntry.can_edit && (
                                        <TableCell>
                                          <div className="flex gap-1">
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={() => openEditPlayerDialog(player)}
                                            >
                                              <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={() => setDeleteConfirmPlayer(player.id)}
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        </TableCell>
                                      )}
                                    </TableRow>
                                  );
                                })}
                            </TableBody>
                          </Table>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Share Access Dialog */}
        <Dialog open={showShareAccessDialog} onOpenChange={setShowShareAccessDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Share Tournament Access</DialogTitle>
              <DialogDescription>
                Allow other members to edit this tournament
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Members</Label>
                <Select
                  value={selectedMemberIds.join(",")}
                  onValueChange={(value) => {
                    if (value && !selectedMemberIds.includes(value)) {
                      setSelectedMemberIds([...selectedMemberIds, value]);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose members..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMembers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedMemberIds.length > 0 && (
                <div className="space-y-2">
                  <Label>Selected Members ({selectedMemberIds.length})</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedMemberIds.map((id) => {
                      const memberObj = availableMembers.find((m) => m.id === id);
                      return (
                        <Badge key={id} variant="secondary" className="flex items-center gap-1">
                          {memberObj?.full_name}
                          <button
                            onClick={() => setSelectedMemberIds(selectedMemberIds.filter((m) => m !== id))}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowShareAccessDialog(false);
                  setSelectedMemberIds([]);
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleShareAccess}
                disabled={submitting || selectedMemberIds.length === 0}
              >
                {submitting ? "Sharing..." : `Share with ${selectedMemberIds.length} member(s)`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Tournament Confirmation */}
        <Dialog open={deleteConfirmEntry !== null} onOpenChange={() => setDeleteConfirmEntry(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Tournament</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this tournament? This will also delete all players and scores. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmEntry(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteConfirmEntry && handleDeleteTournament(deleteConfirmEntry)}
              >
                Delete Tournament
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Player Confirmation */}
        <Dialog open={deleteConfirmPlayer !== null} onOpenChange={() => setDeleteConfirmPlayer(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Player</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this player? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmPlayer(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteConfirmPlayer && handleDeletePlayer(deleteConfirmPlayer)}
              >
                Delete Player
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Share Dialog */}
        <Dialog open={shareEntry !== null} onOpenChange={() => setShareEntry(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Share Tournament</DialogTitle>
              <DialogDescription>
                Share this mini blok tournament with others
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <Label className="block">Public view link (guest boleh view)</Label>
                <Select value={shareMode} onValueChange={(v) => setShareMode(v as "public" | "editable")}>
                  <SelectTrigger className="w-[190px]">
                    <SelectValue placeholder="Share mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public view</SelectItem>
                    <SelectItem value="editable">Editable (login)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={
                    shareEntry
                      ? shareMode === "editable"
                        ? generateShareUrl(shareEntry.id)
                        : shareEntry.share_token
                        ? generateShareTokenUrl(shareEntry.share_token)
                        : ""
                      : ""
                  }
                  className="flex-1"
                  placeholder={shareMode === "public" && shareEntry && !shareEntry.share_token ? "Tiada public link lagi..." : ""}
                />
                
                {shareMode === "public" && shareEntry && !shareEntry.share_token ? (
                  <Button onClick={handleGenerateToken} disabled={isGeneratingToken}>
                    {isGeneratingToken ? "Generating..." : "Generate Public Link"}
                  </Button>
                ) : (
                  <Button onClick={copyShareUrl} variant="outline" disabled={!shareEntry || (shareMode === "public" && !shareEntry.share_token)}>
                    {copiedUrl ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
              {shareMode === "public" && shareEntry && !shareEntry.share_token && (
                <p className="text-xs text-muted-foreground mt-2">
                  Anda perlu "Generate" link ini terlebih dahulu sebelum anda boleh kongsikan dengan public (pelawat tanpa akaun).
                </p>
              )}

              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <Label className="block">Editable link (collaborator)</Label>
                  <Badge variant="secondary">Login required</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  Nota: Collaborator mesti sudah diberi akses melalui “Share Access”.
                </p>
                <div className="flex gap-2">
                  <Input readOnly value={shareEntry ? generateShareUrl(shareEntry.id) : ""} className="flex-1" />
                  <Button onClick={copyEditableLink} variant="outline">
                    {copiedEditUrl ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Share to Social Media</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button onClick={shareToWhatsApp} variant="outline" className="w-full">
                    WhatsApp
                  </Button>
                  <Button onClick={shareToFacebook} variant="outline" className="w-full">
                    Facebook
                  </Button>
                  <Button onClick={shareToTwitter} variant="outline" className="w-full">
                    Twitter
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        {loadingPlayers && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-lg z-10">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
                  <p className="text-sm text-sky-600 font-medium">Updating players...</p>
                </div>
              </div>
            )}
      </div>
      </MemberLayout>
    </PageAccessGuard>
  );
}