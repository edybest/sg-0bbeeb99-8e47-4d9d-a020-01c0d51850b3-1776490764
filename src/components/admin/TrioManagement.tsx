import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Users } from "lucide-react";
import { 
  upsertTrioRecord, 
  getAllTrioRecordsByGame, 
  deleteTrioRecord,
  type TrioPlayer,
  type TrioRecordWithPlayers
} from "@/services/trioService";
import { memberService } from "@/services/memberService";

interface TrioManagementProps {
  gameId: string;
}

export function TrioManagement({ gameId }: TrioManagementProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [players, setPlayers] = useState<TrioPlayer[]>([]);
  const [trios, setTrios] = useState<TrioRecordWithPlayers[]>([]);
  
  // Form state for new trio
  const [player1Id, setPlayer1Id] = useState<string>("");
  const [player2Id, setPlayer2Id] = useState<string>("");
  const [player3Id, setPlayer3Id] = useState<string>("");

  useEffect(() => {
    loadData();
  }, [gameId]);

  async function loadData() {
    try {
      setLoading(true);
      await Promise.all([loadPlayers(), loadTrios()]);
    } catch (error) {
      console.error("Error loading trio data:", error);
      toast({
        title: "Ralat",
        description: "Gagal memuatkan data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadPlayers() {
    try {
      const members = await memberService.getMembersByGameDate(gameId);
      setPlayers(members.map(m => ({
        id: m.id,
        username: m.username,
        full_name: m.full_name,
        avatar_url: m.avatar_url,
        handicap: m.handicap || 0,
      })));
    } catch (error) {
      console.error("Error loading players:", error);
      throw error;
    }
  }

  async function loadTrios() {
    try {
      const trioRecords = await getAllTrioRecordsByGame(gameId);
      setTrios(trioRecords);
    } catch (error) {
      console.error("Error loading trios:", error);
      throw error;
    }
  }

  async function handleAddTrio() {
    if (!player1Id || !player2Id || !player3Id) {
      toast({
        title: "Ralat",
        description: "Sila pilih kesemua 3 pemain (A, B, C)",
        variant: "destructive",
      });
      return;
    }

    // Check for duplicates
    if (player1Id === player2Id || player1Id === player3Id || player2Id === player3Id) {
      toast({
        title: "Ralat",
        description: "Pemain tidak boleh sama. Pilih 3 pemain berbeza.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      const player1 = players.find((p) => p.id === player1Id);
      const player2 = players.find((p) => p.id === player2Id);
      const player3 = players.find((p) => p.id === player3Id);

      if (!player1 || !player2 || !player3) {
        throw new Error("Pemain tidak dijumpai");
      }

      const trioData = {
        game_id: gameId,
        player1_id: player1Id,
        player2_id: player2Id,
        player3_id: player3Id,
        player1_handicap: player1.handicap || 0,
        player2_handicap: player2.handicap || 0,
        player3_handicap: player3.handicap || 0,
        player1_score: 0,
        player2_score: 0,
        player3_score: 0,
      };

      await upsertTrioRecord(trioData);

      toast({
        title: "✅ Berjaya",
        description: "Trio baru telah ditambah",
      });

      // Reset form
      setPlayer1Id("");
      setPlayer2Id("");
      setPlayer3Id("");

      // Reload trios
      await loadTrios();
    } catch (error: any) {
      console.error("Error adding trio:", error);

      const errorMsg = error?.message || "Ralat tidak diketahui";
      toast({
        title: "❌ Gagal Menambah Trio",
        description: errorMsg,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTrio(trioId: string) {
    if (!confirm("Adakah anda pasti mahu memadam trio ini?")) {
      return;
    }

    try {
      await deleteTrioRecord(trioId);
      toast({
        title: "✅ Berjaya",
        description: "Trio telah dipadam",
      });
      await loadTrios();
    } catch (error) {
      console.error("Error deleting trio:", error);
      toast({
        title: "❌ Ralat",
        description: "Gagal memadam trio",
        variant: "destructive",
      });
    }
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add New Trio Form */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-bold">Tambah Trio Baru</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-red-600">
              Player A
            </label>
            <Select value={player1Id} onValueChange={setPlayer1Id}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih Player A" />
              </SelectTrigger>
              <SelectContent>
                {players.map((player) => (
                  <SelectItem key={player.id} value={player.id}>
                    {player.username} ({player.full_name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-blue-600">
              Player B
            </label>
            <Select value={player2Id} onValueChange={setPlayer2Id}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih Player B" />
              </SelectTrigger>
              <SelectContent>
                {players
                  .filter((p) => p.id !== player1Id)
                  .map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.username} ({player.full_name})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-green-600">
              Player C
            </label>
            <Select value={player3Id} onValueChange={setPlayer3Id}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih Player C" />
              </SelectTrigger>
              <SelectContent>
                {players
                  .filter((p) => p.id !== player1Id && p.id !== player2Id)
                  .map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.username} ({player.full_name})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={handleAddTrio}
          disabled={saving || !player1Id || !player2Id || !player3Id}
          className="w-full"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Menyimpan...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Trio
            </>
          )}
        </Button>
      </Card>

      {/* List of Configured Trios */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">
            Senarai Trio ({trios.length})
          </h3>
        </div>

        {trios.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Tiada trio dikonfigurasi lagi</p>
            <p className="text-sm mt-1">Tambah trio pertama di atas</p>
          </div>
        ) : (
          <div className="space-y-3">
            {trios.map((trio, index) => (
              <div
                key={trio.id}
                className="flex items-center gap-3 p-4 bg-gradient-to-r from-slate-50 to-white border rounded-lg"
              >
                <Badge variant="outline" className="text-lg font-bold">
                  #{index + 1}
                </Badge>

                <div className="flex-1 grid grid-cols-3 gap-3">
                  <div className="bg-red-50 border border-red-200 rounded p-2">
                    <div className="text-xs font-semibold text-red-600 mb-1">Player A</div>
                    <div className="text-sm font-bold text-red-800">
                      {trio.player1?.username || "N/A"}
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded p-2">
                    <div className="text-xs font-semibold text-blue-600 mb-1">Player B</div>
                    <div className="text-sm font-bold text-blue-800">
                      {trio.player2?.username || "N/A"}
                    </div>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded p-2">
                    <div className="text-xs font-semibold text-green-600 mb-1">Player C</div>
                    <div className="text-sm font-bold text-green-800">
                      {trio.player3?.username || "N/A"}
                    </div>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteTrio(trio.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}