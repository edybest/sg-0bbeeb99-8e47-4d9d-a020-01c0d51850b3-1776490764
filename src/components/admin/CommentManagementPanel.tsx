import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { gameCommentService } from "@/services/gameCommentService";
import {
  Trash2,
  Ban,
  UnlockKeyhole,
  MessageCircle,
  Loader2,
  AlertTriangle,
} from "lucide-react";
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

interface Comment {
  id: string;
  game_id: string;
  member_id: string;
  username: string;
  content: string;
  created_at: string;
  game?: {
    game_name: string;
    game_date: string;
  };
}

interface BannedUser {
  id: string;
  member_id: string;
  username: string;
  banned_at: string;
  reason: string | null;
}

export function CommentManagementPanel() {
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [commentsData, bannedData] = await Promise.all([
        gameCommentService.getAllComments(),
        gameCommentService.getBannedUsers(),
      ]);

      setComments(commentsData);
      setBannedUsers(bannedData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Ralat",
        description: "Gagal memuatkan data komen",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async () => {
    if (!selectedComment) return;

    try {
      await gameCommentService.deleteComment(selectedComment.id);

      setComments((prev) => prev.filter((c) => c.id !== selectedComment.id));

      toast({
        title: "Berjaya",
        description: "Komen telah dipadam",
      });

      setDeleteDialogOpen(false);
      setSelectedComment(null);
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast({
        title: "Ralat",
        description: "Gagal memadam komen",
        variant: "destructive",
      });
    }
  };

  const handleBanUser = async () => {
    if (!selectedComment) return;

    try {
      await gameCommentService.banUser(selectedComment.member_id);

      setBannedUsers((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          member_id: selectedComment.member_id,
          username: selectedComment.username,
          banned_at: new Date().toISOString(),
          reason: "Banned by admin",
        },
      ]);

      toast({
        title: "Berjaya",
        description: `${selectedComment.username} telah diharamkan dari pos komen`,
      });

      setBanDialogOpen(false);
      setSelectedComment(null);
    } catch (error) {
      console.error("Error banning user:", error);
      toast({
        title: "Ralat",
        description: "Gagal haramkan pengguna",
        variant: "destructive",
      });
    }
  };

  const handleUnbanUser = async (memberId: string, username: string) => {
    try {
      await gameCommentService.unbanUser(memberId);

      setBannedUsers((prev) => prev.filter((u) => u.member_id !== memberId));

      toast({
        title: "Berjaya",
        description: `${username} boleh pos komen semula`,
      });
    } catch (error) {
      console.error("Error unbanning user:", error);
      toast({
        title: "Ralat",
        description: "Gagal buka haramkan pengguna",
        variant: "destructive",
      });
    }
  };

  const openDeleteDialog = (comment: Comment) => {
    setSelectedComment(comment);
    setDeleteDialogOpen(true);
  };

  const openBanDialog = (comment: Comment) => {
    setSelectedComment(comment);
    setBanDialogOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pengurusan Komen</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Recent Comments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Komen Terkini
            </CardTitle>
            <CardDescription>
              {comments.length} komen • Manage dan delete komen yang tidak sesuai
            </CardDescription>
          </CardHeader>
          <CardContent>
            {comments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Tiada komen lagi</p>
              </div>
            ) : (
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="flex items-start justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sky-900">
                          {comment.username}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(comment.created_at).toLocaleString("ms-MY")}
                        </span>
                      </div>

                      <p className="text-sm text-gray-700 mb-2">{comment.content}</p>

                      {comment.game && (
                        <div className="text-xs text-gray-500">
                          Game: {comment.game.game_name} (
                          {new Date(comment.game.game_date).toLocaleDateString("ms-MY")})
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openDeleteDialog(comment)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openBanDialog(comment)}
                        className="text-orange-600 hover:bg-orange-50"
                      >
                        <Ban className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Banned Users */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ban className="w-5 h-5 text-red-600" />
              Pengguna Diharamkan
            </CardTitle>
            <CardDescription>
              {bannedUsers.length} pengguna diharamkan dari pos komen
            </CardDescription>
          </CardHeader>
          <CardContent>
            {bannedUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Ban className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Tiada pengguna diharamkan</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bannedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200"
                  >
                    <div>
                      <div className="font-semibold text-red-900">{user.username}</div>
                      <div className="text-xs text-red-600">
                        Diharamkan: {new Date(user.banned_at).toLocaleString("ms-MY")}
                      </div>
                      {user.reason && (
                        <div className="text-xs text-gray-600 mt-1">
                          Sebab: {user.reason}
                        </div>
                      )}
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUnbanUser(user.member_id, user.username)}
                      className="text-green-600 hover:bg-green-50"
                    >
                      <UnlockKeyhole className="w-4 h-4 mr-2" />
                      Unban
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Padam Komen?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Adakah anda pasti mahu memadam komen ini?
              <div className="mt-3 p-3 bg-gray-100 rounded text-sm">
                <div className="font-semibold text-gray-900 mb-1">
                  {selectedComment?.username}
                </div>
                <div className="text-gray-700">{selectedComment?.content}</div>
              </div>
              <p className="mt-3 text-red-600 font-medium">
                Tindakan ini tidak boleh dibatalkan.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteComment}
              className="bg-red-600 hover:bg-red-700"
            >
              Padam Komen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Ban User Confirmation Dialog */}
      <AlertDialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Ban className="w-5 h-5 text-orange-600" />
              Haramkan Pengguna?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Adakah anda pasti mahu haramkan <strong>{selectedComment?.username}</strong>{" "}
              dari pos komen?
              <div className="mt-3 p-3 bg-orange-50 rounded text-sm border border-orange-200">
                <p className="font-medium text-orange-900">
                  Pengguna ini tidak akan dapat menghantar komen lagi.
                </p>
                <p className="text-orange-700 mt-1">
                  Anda boleh unban kemudian jika perlu.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBanUser}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Haramkan Pengguna
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}