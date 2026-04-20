import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getGamePlayers, upsertTrioRecord, getTrioRecordByGame } from "@/services/trioService";
import { Loader2, Users } from "lucide-react";

interface TrioManagementProps {
  gameId: string;
}

interface Player {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  handicap: number;
}

export function TrioManagement({ gameId }: TrioManagementProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [player1Id, setPlayer1Id] = useState<string>("");
  const [player2Id, setPlayer2Id] = useState<string>("");
  const [player3Id, setPlayer3Id] = useState<string>("");

  useEffect(() => {
    loadTrioData();
  }, [gameId]);

  async function loadTrioData() {
    try {
      setLoading(true);

      // Load all players for this game
      const gamePlayers = await getGamePlayers(gameId);
      setPlayers(gamePlayers);

      // Load existing trio configuration
      const trioRecord = await getTrioRecordByGame(gameId);
      if (trioRecord) {
        setPlayer1Id(trioRecord.player1_id || "");
        setPlayer2Id(trioRecord.player2_id || "");
        setPlayer3Id(trioRecord.player3_id || "");
      }
    } catch (error) {
      console.error("Error loading trio data:", error);
      toast({
        title: "Error",
        description: "Gagal memuatkan data trio",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
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

      await upsertTrioRecord({
        game_id: gameId,
        player1_id: player1Id,
        player2_id: player2Id,
        player3_id: player3Id,
        player1_handicap: player1?.handicap || 0,
        player2_handicap: player2?.handicap || 0,
        player3_handicap: player3?.handicap || 0,
        player1_score: 0,
        player2_score: 0,
        player3_score: 0,
        total_score: 0,
      });

      toast({
        title: "✅ Berjaya",
        description: "Konfigurasi Trio telah disimpan",
      });
    } catch (error) {
      console.error("Error saving trio:", error);
      toast({
        title: "Error",
        description: "Gagal menyimpan konfigurasi trio",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (players.length < 3) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p>Sekurang-kurangnya 3 pemain diperlukan untuk Trio Mode</p>
        </div>
      </Card>
    );
  }

  const getPlayerDisplay = (playerId: string) => {
    const player = players.find((p) => p.id === playerId);
    if (!player) return null;
    return (
      <div className="flex items-center gap-2 mt-1">
        {player.avatar_url && (
          <img src={player.avatar_url} alt={player.username} className="w-8 h-8 rounded-full object-cover" />
        )}
        <div>
          <div className="font-semibold text-sm">{player.username}</div>
          <div className="text-xs text-muted-foreground">Handicap: {player.handicap}</div>
        </div>
      </div>
    );
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Users className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-bold">Konfigurasi Trio Players</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Player A */}
        <div>
          <Label className="mb-2 flex items-center gap-2">
            <Badge variant="default" className="bg-red-500">PLAYER A</Badge>
          </Label>
          <Select value={player1Id} onValueChange={setPlayer1Id}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Pilih Player A" />
            </SelectTrigger>
            <SelectContent>
              {players.map((player) => (
                <SelectItem key={player.id} value={player.id}>
                  {player.username} (HC: {player.handicap})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {player1Id && getPlayerDisplay(player1Id)}
        </div>

        {/* Player B */}
        <div>
          <Label className="mb-2 flex items-center gap-2">
            <Badge variant="default" className="bg-blue-500">PLAYER B</Badge>
          </Label>
          <Select value={player2Id} onValueChange={setPlayer2Id}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Pilih Player B" />
            </SelectTrigger>
            <SelectContent>
              {players.map((player) => (
                <SelectItem key={player.id} value={player.id}>
                  {player.username} (HC: {player.handicap})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {player2Id && getPlayerDisplay(player2Id)}
        </div>

        {/* Player C */}
        <div>
          <Label className="mb-2 flex items-center gap-2">
            <Badge variant="default" className="bg-green-500">PLAYER C</Badge>
          </Label>
          <Select value={player3Id} onValueChange={setPlayer3Id}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Pilih Player C" />
            </SelectTrigger>
            <SelectContent>
              {players.map((player) => (
                <SelectItem key={player.id} value={player.id}>
                  {player.username} (HC: {player.handicap})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {player3Id && getPlayerDisplay(player3Id)}
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Menyimpan...
          </>
        ) : (
          "💾 Simpan Konfigurasi Trio"
        )}
      </Button>
    </Card>
  );
}