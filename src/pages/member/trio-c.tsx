import React, { useState, useEffect, useRef } from "react";
import { MemberLayout } from "@/components/member/MemberLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { getTrioEnabledGames, getTrioRecordByGame } from "@/services/trioService";
import { laneService } from "@/services/laneService";
import { Loader2, Users, Trophy } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Game = Database["public"]["Tables"]["games"]["Row"];
type Lane = Database["public"]["Tables"]["lanes"]["Row"];

export default function TrioPlayerCPage() {
  const { toast } = useToast();
  const { member } = useAuth();
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string>("");
  const [lanes, setLanes] = useState<Lane[]>([]);
  const [result, setResult] = useState<Lane | null>(null);
  const [playerName, setPlayerName] = useState<string>("");
  
  const wheelRef = useRef<HTMLDivElement>(null);
  const spinAudioRef = useRef<HTMLAudioElement | null>(null);
  const winAudioRef = useRef<HTMLAudioElement | null>(null);

  const isAdmin = member?.is_admin || false;

  useEffect(() => {
    loadData();
    
    spinAudioRef.current = new Audio("/spin.mp3");
    winAudioRef.current = new Audio("/win.mp3");
  }, []);

  useEffect(() => {
    if (selectedGameId) {
      loadTrioPlayer();
      loadLanes();
    }
  }, [selectedGameId]);

  async function loadData() {
    try {
      setLoading(true);
      const trioGames = await getTrioEnabledGames();
      setGames(trioGames);
      
      if (trioGames.length > 0) {
        setSelectedGameId(trioGames[0].id);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Gagal memuatkan data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadTrioPlayer() {
    if (!selectedGameId) return;

    try {
      const trioRecord = await getTrioRecordByGame(selectedGameId);
      if (trioRecord?.player3) {
        setPlayerName(trioRecord.player3.username);
      } else {
        setPlayerName("Belum Ditetapkan");
      }
    } catch (error) {
      console.error("Error loading trio player:", error);
    }
  }

  async function loadLanes() {
    if (!selectedGameId) return;

    try {
      const allLanes = await laneService.getAllLanes();
      setLanes(allLanes);
    } catch (error) {
      console.error("Error loading lanes:", error);
      toast({
        title: "Error",
        description: "Gagal memuatkan senarai lane",
        variant: "destructive",
      });
    }
  }

  async function handleSpin() {
    if (lanes.length === 0) {
      toast({
        title: "Error",
        description: "Tiada lane tersedia",
        variant: "destructive",
      });
      return;
    }

    setSpinning(true);
    setResult(null);

    if (spinAudioRef.current) {
      spinAudioRef.current.currentTime = 0;
      spinAudioRef.current.play().catch(console.error);
    }

    const spinDuration = 3000 + Math.random() * 2000;
    const startTime = Date.now();

    const spinInterval = setInterval(() => {
      if (wheelRef.current) {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / spinDuration;
        const rotation = progress * 360 * 5;
        wheelRef.current.style.transform = `rotate(${rotation}deg)`;
      }
    }, 16);

    setTimeout(() => {
      clearInterval(spinInterval);
      
      const selectedLane = lanes[Math.floor(Math.random() * lanes.length)];
      setResult(selectedLane);
      setSpinning(false);

      if (winAudioRef.current) {
        winAudioRef.current.currentTime = 0;
        winAudioRef.current.play().catch(console.error);
      }

      toast({
        title: "🎯 Lane Dipilih!",
        description: `${playerName} dapat Lane ${selectedLane.lane_number}`,
        duration: 5000,
      });
    }, spinDuration);
  }

  if (loading) {
    return (
      <MemberLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </MemberLayout>
    );
  }

  if (games.length === 0) {
    return (
      <MemberLayout>
        <div className="container mx-auto p-4">
          <Card className="p-8 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-bold mb-2">Tiada Game Trio Aktif</h2>
            <p className="text-muted-foreground">Sila aktifkan Trio Mode pada game dahulu</p>
          </Card>
        </div>
      </MemberLayout>
    );
  }

  return (
    <MemberLayout>
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Badge className="bg-green-500 text-white px-4 py-2 text-lg">PLAYER C</Badge>
            <Trophy className="w-6 h-6 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Undi Lane - Trio Player C</h1>
          <p className="text-muted-foreground mt-1">Roda undian khas untuk Player C</p>
        </div>

        <Card className="p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Pilih Game:</label>
              <Select value={selectedGameId} onValueChange={setSelectedGameId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih game" />
                </SelectTrigger>
                <SelectContent>
                  {games.map((game) => (
                    <SelectItem key={game.id} value={game.id}>
                      {new Date(game.game_date).toLocaleDateString("ms-MY", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })} - {game.game_name || "Game"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-green-900">Player C:</span>
              </div>
              <div className="text-2xl font-bold text-green-600">{playerName}</div>
            </div>
          </div>
        </Card>

        <Card className="p-8">
          <div className="flex flex-col items-center">
            <div className="relative w-72 h-72 mb-8">
              <div
                ref={wheelRef}
                className="w-full h-full rounded-full border-8 border-green-500 bg-gradient-to-br from-green-400 to-green-600 shadow-2xl flex items-center justify-center transition-transform"
                style={{ transitionDuration: "0ms" }}
              >
                <div className="text-white text-6xl font-bold">🎳</div>
              </div>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0 h-0 border-l-[20px] border-r-[20px] border-t-[40px] border-l-transparent border-r-transparent border-t-green-800 z-10"></div>
            </div>

            {result && (
              <div className="mb-6 text-center animate-bounce">
                <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl p-6 shadow-xl">
                  <div className="text-sm font-semibold mb-2">{playerName}</div>
                  <div className="text-5xl font-black">LANE {result.lane_number}</div>
                </div>
              </div>
            )}

            <Button
              onClick={handleSpin}
              disabled={spinning || !isAdmin}
              size="lg"
              className="bg-green-600 hover:bg-green-700 text-white px-12 py-6 text-xl font-bold rounded-xl shadow-lg"
            >
              {spinning ? (
                <>
                  <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                  Memutar...
                </>
              ) : (
                "🎰 UNDI LANE"
              )}
            </Button>

            {!isAdmin && (
              <p className="text-sm text-muted-foreground mt-4">
                ⚠️ Hanya admin boleh tekan butang undi
              </p>
            )}
          </div>
        </Card>

        <Card className="p-6 mt-6">
          <h3 className="text-lg font-bold mb-4">Senarai Lane Tersedia</h3>
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {lanes.map((lane) => (
              <div
                key={lane.id}
                className={`p-3 text-center rounded-lg border-2 font-bold transition-all ${
                  result?.id === lane.id
                    ? "bg-green-500 text-white border-green-600 scale-110 shadow-lg"
                    : "bg-gray-50 text-gray-700 border-gray-200 hover:border-green-300"
                }`}
              >
                {lane.lane_number}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </MemberLayout>
  );
}