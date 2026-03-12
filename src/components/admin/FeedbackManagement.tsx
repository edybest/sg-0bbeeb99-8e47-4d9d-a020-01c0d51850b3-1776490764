import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  getAllFeedback,
  updateFeedbackStatus,
  replyToFeedback,
  getFeedbackStats,
  type FeedbackWithMember,
  type FeedbackStatus,
  type FeedbackCategory,
} from "@/services/feedbackService";
import { MessageSquare, Bug, HelpCircle, Clock, Check, CheckCircle2, Send, Eye, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";
import { ms } from "date-fns/locale";
import { motion } from "framer-motion";

const categoryConfig = {
  cadangan: {
    label: "Cadangan",
    icon: MessageSquare,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    badgeVariant: "default" as const,
  },
  ralat_sistem: {
    label: "Ralat Sistem",
    icon: Bug,
    color: "text-red-600",
    bgColor: "bg-red-50",
    badgeVariant: "destructive" as const,
  },
  pertanyaan_lain: {
    label: "Pertanyaan Lain",
    icon: HelpCircle,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    badgeVariant: "secondary" as const,
  },
};

const statusConfig = {
  pending: {
    label: "Belum Dibaca",
    icon: Clock,
    color: "text-gray-600",
    bgColor: "bg-gray-100",
    badgeVariant: "outline" as const,
  },
  read: {
    label: "Dibaca",
    icon: Check,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    badgeVariant: "default" as const,
  },
  resolved: {
    label: "Selesai",
    icon: CheckCircle2,
    color: "text-green-600",
    bgColor: "bg-green-100",
    badgeVariant: "default" as const,
  },
};

export function FeedbackManagement() {
  const { toast } = useToast();
  const [feedback, setFeedback] = useState<FeedbackWithMember[]>([]);
  const [filteredFeedback, setFilteredFeedback] = useState<FeedbackWithMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    read: 0,
    resolved: 0,
    by_category: {
      cadangan: 0,
      ralat_sistem: 0,
      pertanyaan_lain: 0,
    },
  });

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Reply dialog
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackWithMember | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  // Image preview
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState("");

  useEffect(() => {
    loadFeedback();
    loadStats();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [feedback, categoryFilter, statusFilter, searchTerm]);

  const loadFeedback = async () => {
    try {
      setLoading(true);
      const data = await getAllFeedback();
      setFeedback(data);
    } catch (error) {
      console.error("Error loading feedback:", error);
      toast({
        variant: "destructive",
        title: "Ralat",
        description: "Gagal memuatkan maklum balas",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await getFeedbackStats();
      setStats(data);
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const applyFilters = () => {
    let filtered = [...feedback];

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter((f) => f.category === categoryFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((f) => f.status === statusFilter);
    }

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (f) =>
          f.subject.toLowerCase().includes(term) ||
          f.message.toLowerCase().includes(term) ||
          f.members.full_name.toLowerCase().includes(term) ||
          f.members.username.toLowerCase().includes(term)
      );
    }

    setFilteredFeedback(filtered);
  };

  const handleUpdateStatus = async (feedbackId: string, newStatus: FeedbackStatus) => {
    try {
      await updateFeedbackStatus(feedbackId, newStatus);
      toast({
        title: "Status dikemaskini",
        description: "Status maklum balas telah dikemaskini",
      });
      await loadFeedback();
      await loadStats();
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        variant: "destructive",
        title: "Ralat",
        description: "Gagal mengemaskini status",
      });
    }
  };

  const handleReply = async () => {
    if (!selectedFeedback || !replyText.trim()) return;

    try {
      setSubmittingReply(true);
      // Note: You need to pass admin user ID here - get from auth context
      await replyToFeedback(selectedFeedback.id, replyText.trim(), "admin-user-id");
      toast({
        title: "Balasan dihantar",
        description: "Balasan anda telah dihantar kepada ahli",
      });
      setReplyDialogOpen(false);
      setReplyText("");
      setSelectedFeedback(null);
      await loadFeedback();
      await loadStats();
    } catch (error) {
      console.error("Error replying:", error);
      toast({
        variant: "destructive",
        title: "Ralat",
        description: "Gagal menghantar balasan",
      });
    } finally {
      setSubmittingReply(false);
    }
  };

  const openReplyDialog = (fb: FeedbackWithMember) => {
    setSelectedFeedback(fb);
    setReplyText(fb.admin_reply || "");
    setReplyDialogOpen(true);
  };

  const openImagePreview = (url: string) => {
    setPreviewImageUrl(url);
    setImagePreviewOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Jumlah Maklum Balas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Belum Dibaca
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Dibaca
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.read}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Selesai
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Penapis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  <SelectItem value="cadangan">Cadangan ({stats.by_category.cadangan})</SelectItem>
                  <SelectItem value="ralat_sistem">Ralat Sistem ({stats.by_category.ralat_sistem})</SelectItem>
                  <SelectItem value="pertanyaan_lain">Pertanyaan Lain ({stats.by_category.pertanyaan_lain})</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="pending">Belum Dibaca</SelectItem>
                  <SelectItem value="read">Dibaca</SelectItem>
                  <SelectItem value="resolved">Selesai</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Carian</Label>
              <Input
                placeholder="Cari subjek, mesej atau nama ahli..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feedback List */}
      <Card>
        <CardHeader>
          <CardTitle>Senarai Maklum Balas</CardTitle>
          <CardDescription>
            {filteredFeedback.length} daripada {feedback.length} maklum balas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
              <p className="mt-4 text-sm text-muted-foreground">Memuatkan...</p>
            </div>
          ) : filteredFeedback.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">Tiada maklum balas dijumpai</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFeedback.map((fb) => {
                const category = categoryConfig[fb.category as FeedbackCategory];
                const status = statusConfig[fb.status as keyof typeof statusConfig];
                const CategoryIcon = category.icon;
                const StatusIcon = status.icon;

                return (
                  <motion.div
                    key={fb.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`p-2 rounded-lg ${category.bgColor}`}>
                          <CategoryIcon className={`w-5 h-5 ${category.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 line-clamp-1">
                            {fb.subject}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-gray-600">
                              {fb.members.full_name} (@{fb.members.username})
                            </span>
                            <Badge variant={category.badgeVariant}>
                              {category.label}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${status.bgColor}`}>
                        <StatusIcon className={`w-4 h-4 ${status.color}`} />
                        <span className={`text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                    </div>

                    {/* Message */}
                    <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">
                      {fb.message}
                    </p>

                    {/* Screenshot */}
                    {fb.screenshot_url && (
                      <div className="mb-3">
                        <button
                          onClick={() => openImagePreview(fb.screenshot_url!)}
                          className="relative group"
                        >
                          <img
                            src={fb.screenshot_url}
                            alt="Screenshot"
                            className="w-full max-w-xs h-32 object-cover rounded-lg border hover:border-primary transition-colors"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                            <Eye className="w-6 h-6 text-white" />
                          </div>
                        </button>
                      </div>
                    )}

                    {/* Admin Reply */}
                    {fb.admin_reply && (
                      <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-xs font-semibold text-green-900 mb-1">
                          Balasan Admin:
                        </p>
                        <p className="text-sm text-green-800 whitespace-pre-wrap">
                          {fb.admin_reply}
                        </p>
                        {fb.replied_at && (
                          <p className="text-xs text-green-600 mt-2">
                            {format(new Date(fb.replied_at), "dd MMM yyyy, hh:mm a", {
                              locale: ms,
                            })}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-3 border-t">
                      <p className="text-xs text-gray-500">
                        Dihantar: {format(new Date(fb.created_at), "dd MMM yyyy, hh:mm a", {
                          locale: ms,
                        })}
                      </p>
                      <div className="flex items-center gap-2">
                        {fb.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateStatus(fb.id, "read")}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Tandakan Dibaca
                          </Button>
                        )}
                        {fb.status === "read" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateStatus(fb.id, "resolved")}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Tandakan Selesai
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => openReplyDialog(fb)}
                        >
                          <Send className="w-4 h-4 mr-1" />
                          {fb.admin_reply ? "Edit Balasan" : "Balas"}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reply Dialog */}
      <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Balas Maklum Balas</DialogTitle>
            <DialogDescription>
              {selectedFeedback && (
                <>
                  <span className="font-semibold">{selectedFeedback.subject}</span>
                  <br />
                  Daripada: {selectedFeedback.members.full_name}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedFeedback && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {selectedFeedback.message}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reply">Balasan Anda</Label>
                <Textarea
                  id="reply"
                  placeholder="Tulis balasan anda di sini..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={6}
                  maxLength={1000}
                />
                <p className="text-xs text-gray-500 text-right">
                  {replyText.length}/1000 aksara
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReplyDialogOpen(false);
                setReplyText("");
                setSelectedFeedback(null);
              }}
            >
              Batal
            </Button>
            <Button
              onClick={handleReply}
              disabled={!replyText.trim() || submittingReply}
            >
              {submittingReply ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                  Menghantar...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Hantar Balasan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={imagePreviewOpen} onOpenChange={setImagePreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Screenshot</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-auto">
            <img
              src={previewImageUrl}
              alt="Screenshot preview"
              className="w-full h-auto rounded-lg"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}