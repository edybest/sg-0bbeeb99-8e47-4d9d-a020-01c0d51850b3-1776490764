import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Edit2,
  Trash2,
  Share2,
  Calendar,
  MapPin,
  User,
  Trophy,
  TrendingUp,
  Copy,
  Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { MobileNav } from "@/components/member/MobileNav";
import { BowlingBallLoader } from "@/components/BowlingBallLoader";
import {
  getMiniBlokEntries,
  getMiniBlokEntryById,
  createMiniBlokEntry,
  updateMiniBlokEntry,
  deleteMiniBlokEntry,
  generateShareUrl,
  generateShareText,
  type MiniBlokWithStats,
} from "@/services/miniBlokService";

interface FormData {
  title: string;
  player_name: string;
  location: string;
  date: string;
  handicap: number;
  game_1: number | null;
  game_2: number | null;
  game_3: number | null;
  game_4: number | null;
  game_5: number | null;
  game_6: number | null;
  game_7: number | null;
  game_8: number | null;
  game_9: number | null;
  game_10: number | null;
}

const INITIAL_FORM: FormData = {
  title: "",
  player_name: "",
  location: "Daiman Bowl",
  date: new Date().toISOString().split("T")[0],
  handicap: 0,
  game_1: null,
  game_2: null,
  game_3: null,
  game_4: null,
  game_5: null,
  game_6: null,
  game_7: null,
  game_8: null,
  game_9: null,
  game_10: null,
};

const GAME_COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-cyan-500",
  "bg-yellow-500",
  "bg-red-500",
  "bg-indigo-500",
  "bg-teal-500",
];

export default function MiniBlokPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { member, loading: authLoading } = useAuth();
  
  const [entries, setEntries] = useState<MiniBlokWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingEntry, setEditingEntry] = useState<MiniBlokWithStats | null>(null);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [shareEntry, setShareEntry] = useState<MiniBlokWithStats | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const canEdit = !authLoading && (member !== null);

  useEffect(() => {
    loadEntries();
  }, []);

  useEffect(() => {
    if (router.query.entry && typeof router.query.entry === "string") {
      loadSharedEntry(router.query.entry);
    }
  }, [router.query.entry]);

  async function loadEntries() {
    try {
      setLoading(true);
      const data = await getMiniBlokEntries();
      setEntries(data);
    } catch (error) {
      console.error("Error loading mini blok entries:", error);
      toast({
        title: "Error",
        description: "Failed to load entries",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadSharedEntry(entryId: string) {
    try {
      const entry = await getMiniBlokEntryById(entryId);
      if (entry) {
        setTimeout(() => {
          const element = document.getElementById(`entry-${entryId}`);
          element?.scrollIntoView({ behavior: "smooth", block: "center" });
          element?.classList.add("ring-4", "ring-primary", "ring-offset-4");
          setTimeout(() => {
            element?.classList.remove("ring-4", "ring-primary", "ring-offset-4");
          }, 3000);
        }, 500);
      }
    } catch (error) {
      console.error("Error loading shared entry:", error);
    }
  }

  function openAddDialog() {
    setEditingEntry(null);
    setFormData(INITIAL_FORM);
    setShowDialog(true);
  }

  function openEditDialog(entry: MiniBlokWithStats) {
    setEditingEntry(entry);
    setFormData({
      title: entry.title || "",
      player_name: entry.player_name,
      location: entry.location,
      date: entry.date,
      handicap: entry.handicap,
      game_1: entry.game_1,
      game_2: entry.game_2,
      game_3: entry.game_3,
      game_4: entry.game_4,
      game_5: entry.game_5,
      game_6: entry.game_6,
      game_7: entry.game_7,
      game_8: entry.game_8,
      game_9: entry.game_9,
      game_10: entry.game_10,
    });
    setShowDialog(true);
  }

  async function handleSubmit() {
    if (!formData.player_name.trim()) {
      toast({
        title: "Validation Error",
        description: "Player name is required",
        variant: "destructive",
      });
      return;
    }

    const games = [
      formData.game_1,
      formData.game_2,
      formData.game_3,
      formData.game_4,
      formData.game_5,
      formData.game_6,
      formData.game_7,
      formData.game_8,
      formData.game_9,
      formData.game_10,
    ].filter(g => g !== null && g > 0);

    if (games.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one game score is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      if (editingEntry) {
        await updateMiniBlokEntry(editingEntry.id, formData);
        toast({
          title: "Success",
          description: "Entry updated successfully",
        });
      } else {
        await createMiniBlokEntry(formData);
        toast({
          title: "Success",
          description: "Entry created successfully",
        });
      }

      setShowDialog(false);
      setFormData(INITIAL_FORM);
      setEditingEntry(null);
      loadEntries();
    } catch (error) {
      console.error("Error saving entry:", error);
      toast({
        title: "Error",
        description: "Failed to save entry",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMiniBlokEntry(id);
      toast({
        title: "Success",
        description: "Entry deleted successfully",
      });
      setDeleteConfirm(null);
      loadEntries();
    } catch (error) {
      console.error("Error deleting entry:", error);
      toast({
        title: "Error",
        description: "Failed to delete entry",
        variant: "destructive",
      });
    }
  }

  function handleShare(entry: MiniBlokWithStats) {
    setShareEntry(entry);
    setCopiedUrl(false);
  }

  async function copyShareUrl() {
    if (!shareEntry) return;

    const url = generateShareUrl(shareEntry.id);
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

  function shareToWhatsApp() {
    if (!shareEntry) return;
    const text = generateShareText(shareEntry);
    const url = generateShareUrl(shareEntry.id);
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text + "\n\n" + url)}`;
    window.open(whatsappUrl, "_blank");
  }

  function shareToFacebook() {
    if (!shareEntry) return;
    const url = generateShareUrl(shareEntry.id);
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(fbUrl, "_blank");
  }

  function shareToTwitter() {
    if (!shareEntry) return;
    const text = generateShareText(shareEntry);
    const url = generateShareUrl(shareEntry.id);
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, "_blank");
  }

  function getGameScores(entry: MiniBlokWithStats): number[] {
    return [
      entry.game_1,
      entry.game_2,
      entry.game_3,
      entry.game_4,
      entry.game_5,
      entry.game_6,
      entry.game_7,
      entry.game_8,
      entry.game_9,
      entry.game_10,
    ].filter((g): g is number => g !== null && g > 0);
  }

  if (loading) {
    return <BowlingBallLoader />;
  }

  return (
    <>
      <Head>
        <title>Mini Blok - AMBC CLUB</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <MobileNav />

        <div className="container mx-auto px-4 py-6 pb-24 md:pb-6 max-w-7xl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                🎳 Mini Blok
              </h1>
              <p className="text-muted-foreground mt-1">
                Casual bowling scores tracker
              </p>
            </div>

            {canEdit && (
              <Button onClick={openAddDialog} size="lg" className="w-full sm:w-auto">
                <Plus className="h-5 w-5 mr-2" />
                Add Entry
              </Button>
            )}
          </div>

          {/* Entries Grid */}
          {entries.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Trophy className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No entries yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {canEdit
                    ? "Start by adding your first mini blok entry"
                    : "Be the first to add an entry!"}
                </p>
                {canEdit && (
                  <Button onClick={openAddDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Entry
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {entries.map((entry) => {
                const games = getGameScores(entry);
                return (
                  <Card
                    key={entry.id}
                    id={`entry-${entry.id}`}
                    className="transition-all duration-300 hover:shadow-lg"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg mb-2 truncate">
                            {entry.title || "Mini Blok"}
                          </CardTitle>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <User className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{entry.player_name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <MapPin className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{entry.location}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4 flex-shrink-0" />
                            <span>{new Date(entry.date).toLocaleDateString("en-MY")}</span>
                          </div>
                        </div>

                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleShare(entry)}
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                          {canEdit && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openEditDialog(entry)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeleteConfirm(entry.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent>
                      {/* Game Scores */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {games.map((score, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className={`${GAME_COLORS[idx]} text-white font-semibold px-3 py-1`}
                          >
                            G{idx + 1}: {score}
                          </Badge>
                        ))}
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-muted/50 rounded-lg p-3">
                          <div className="text-muted-foreground mb-1">Average</div>
                          <div className="text-2xl font-bold">{entry.average}</div>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3">
                          <div className="text-muted-foreground mb-1">Total</div>
                          <div className="text-2xl font-bold">{entry.total_score}</div>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3">
                          <div className="text-muted-foreground mb-1">Handicap</div>
                          <div className="text-2xl font-bold">{entry.handicap}</div>
                        </div>
                        <div className="bg-primary/10 rounded-lg p-3">
                          <div className="text-muted-foreground mb-1">Overall</div>
                          <div className="text-2xl font-bold text-primary">
                            {entry.overall_score}
                          </div>
                        </div>
                      </div>

                      {/* Differential */}
                      <div className="mt-3 flex items-center justify-center gap-2 bg-accent/50 rounded-lg p-2">
                        <TrendingUp className={`h-4 w-4 ${entry.differential > 0 ? "text-green-500" : "text-red-500"}`} />
                        <span className={`font-semibold ${entry.differential > 0 ? "text-green-600" : "text-red-600"}`}>
                          Diff: {entry.differential > 0 ? "+" : ""}{entry.differential}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEntry ? "Edit Entry" : "Add New Entry"}
            </DialogTitle>
            <DialogDescription>
              Enter the bowling scores and details
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="player_name">Player Name *</Label>
                <Input
                  id="player_name"
                  value={formData.player_name}
                  onChange={(e) =>
                    setFormData({ ...formData, player_name: e.target.value })
                  }
                  placeholder="Enter player name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title (Optional)</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="e.g., Blok Suka Suki"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  placeholder="Daiman Bowl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="handicap">Handicap</Label>
                <Input
                  id="handicap"
                  type="number"
                  min="0"
                  value={formData.handicap}
                  onChange={(e) =>
                    setFormData({ ...formData, handicap: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
            </div>

            {/* Game Scores */}
            <div>
              <Label className="mb-3 block">Game Scores (1-10 games)</Label>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((gameNum) => (
                  <div key={gameNum} className="space-y-2">
                    <Label htmlFor={`game_${gameNum}`} className="text-xs">
                      Game {gameNum}
                    </Label>
                    <Input
                      id={`game_${gameNum}`}
                      type="number"
                      min="0"
                      max="300"
                      value={formData[`game_${gameNum}` as keyof FormData] as number || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          [`game_${gameNum}`]: e.target.value ? parseInt(e.target.value) : null,
                        })
                      }
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Saving..." : editingEntry ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Entry</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this entry? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={shareEntry !== null} onOpenChange={() => setShareEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Entry</DialogTitle>
            <DialogDescription>
              Share this mini blok entry with others
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Copy Link */}
            <div>
              <Label className="mb-2 block">Share Link</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={shareEntry ? generateShareUrl(shareEntry.id) : ""}
                  className="flex-1"
                />
                <Button onClick={copyShareUrl} variant="outline">
                  {copiedUrl ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Share Buttons */}
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
    </>
  );
}