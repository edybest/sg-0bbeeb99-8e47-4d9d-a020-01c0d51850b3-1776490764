import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { coupleService, type CoupleWithPlayers } from "@/services/coupleService";
import { memberService } from "@/services/memberService";
import { Users, Plus, Edit, Trash2, Heart, Loader2 } from "lucide-react";

type Member = {
  id: string;
  full_name: string;
  username: string;
};

export function CoupleManagement() {
  const { toast } = useToast();
  const [couples, setCouples] = useState<CoupleWithPlayers[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCouple, setEditingCouple] = useState<CoupleWithPlayers | null>(null);

  const [formData, setFormData] = useState({
    couple_name: "",
    player1_id: "",
    player2_id: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log("Loading couples and members...");
      
      const [couplesData, membersData] = await Promise.all([
        coupleService.getAllCouples(),
        memberService.getAllMembers(),
      ]);

      console.log("Couples data:", couplesData);
      console.log("Members data:", membersData);

      setCouples(couplesData);
      setMembers(
        membersData.map((m) => ({
          id: m.id,
          full_name: m.full_name || "Unknown",
          username: m.username || "Unknown",
        }))
      );
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.couple_name.trim()) {
      toast({
        title: "Validation Error",
        description: "Couple name is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.player1_id || !formData.player2_id) {
      toast({
        title: "Validation Error",
        description: "Both players must be selected",
        variant: "destructive",
      });
      return;
    }

    if (formData.player1_id === formData.player2_id) {
      toast({
        title: "Validation Error",
        description: "Players must be different",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingCouple) {
        await coupleService.updateCouple(editingCouple.id, formData);
        toast({
          title: "Success",
          description: "Couple updated successfully",
        });
      } else {
        await coupleService.createCouple(formData);
        toast({
          title: "Success",
          description: "Couple created successfully",
        });
      }

      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error("Error saving couple:", error);
      toast({
        title: "Error",
        description: "Failed to save couple",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (couple: CoupleWithPlayers) => {
    setEditingCouple(couple);
    setFormData({
      couple_name: couple.couple_name,
      player1_id: couple.player1_id,
      player2_id: couple.player2_id,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this couple?")) {
      return;
    }

    try {
      await coupleService.deleteCouple(id);
      toast({
        title: "Success",
        description: "Couple deleted successfully",
      });
      loadData();
    } catch (error) {
      console.error("Error deleting couple:", error);
      toast({
        title: "Error",
        description: "Failed to delete couple",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      couple_name: "",
      player1_id: "",
      player2_id: "",
    });
    setEditingCouple(null);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-6 h-6 text-red-500" />
            Couple Management
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Couple
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCouple ? "Edit Couple" : "Add New Couple"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="couple_name">Couple Name *</Label>
                  <Input
                    id="couple_name"
                    placeholder="e.g., Win Streak"
                    value={formData.couple_name}
                    onChange={(e) =>
                      setFormData({ ...formData, couple_name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="player1">Player 1 *</Label>
                  <Select
                    value={formData.player1_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, player1_id: value })
                    }
                  >
                    <SelectTrigger id="player1">
                      <SelectValue placeholder="Select Player 1" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.username} ({member.full_name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="player2">Player 2 *</Label>
                  <Select
                    value={formData.player2_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, player2_id: value })
                    }
                  >
                    <SelectTrigger id="player2">
                      <SelectValue placeholder="Select Player 2" />
                    </SelectTrigger>
                    <SelectContent>
                      {members
                        .filter((m) => m.id !== formData.player1_id)
                        .map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.username} ({member.full_name})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    {editingCouple ? "Update" : "Create"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleDialogClose(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Couple Name</TableHead>
                <TableHead>Player 1</TableHead>
                <TableHead>Player 2</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {couples.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No couples yet. Click "Add Couple" to create one.</p>
                  </TableCell>
                </TableRow>
              ) : (
                couples.map((couple) => (
                  <TableRow key={couple.id}>
                    <TableCell className="font-semibold">
                      {couple.couple_name}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-500">
                        {couple.player1_name || "Unknown"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-500">
                        {couple.player2_name || "Unknown"}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(couple)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(couple.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}