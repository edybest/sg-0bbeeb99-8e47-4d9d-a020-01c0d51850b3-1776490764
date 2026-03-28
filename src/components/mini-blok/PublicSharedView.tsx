import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MapPin, Calendar, Users, ArrowLeft, Eye } from "lucide-react";
import { calculatePlayerStats, type MiniBlokPublicShared } from "@/services/miniBlokService";
import { GAME_COLORS } from "./constants";

export function PublicSharedView({
  shared,
  onBack,
}: {
  shared: MiniBlokPublicShared;
  onBack: () => void;
}) {
  const entry = shared.entry;
  const players = [...shared.players].sort((a, b) => {
    const statsA = calculatePlayerStats(a, entry.num_games || 5);
    const statsB = calculatePlayerStats(b, entry.num_games || 5);
    return statsB.overall_score - statsA.overall_score;
  });
  const [expandedScores, setExpandedScores] = useState<Record<string, boolean>>({});

  return (
    <div className="container mx-auto px-4 py-6 pb-24 md:pb-6 max-w-7xl">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Eye className="h-6 w-6 text-pink-600" />
            Shared Mini Blok
          </h1>
          <p className="text-muted-foreground mt-1">
            View-only · No login required
          </p>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-xl">{entry.title || "Mini Blok Tournament"}</CardTitle>
          <div className="grid gap-2 md:grid-cols-3 text-sm text-muted-foreground mt-2">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="truncate">{entry.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{new Date(entry.date).toLocaleDateString("en-MY")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>{players.length} players · {entry.num_games} games</span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {players.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No players yet
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Leaderboard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Player</TableHead>
                    {Array.from({ length: entry.num_games || 5 }, (_, i) => (
                      <TableHead key={i} className="text-center">G{i + 1}</TableHead>
                    ))}
                    <TableHead className="text-center">HCP</TableHead>
                    <TableHead className="text-center">Avg</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">Overall</TableHead>
                    <TableHead className="text-center">Diff</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {players.map((player, idx) => {
                    const stats = calculatePlayerStats(player, entry.num_games || 5);
                    const scores = (player.scores as Record<string, number>) || {};
                    return (
                      <TableRow key={player.id}>
                        <TableCell>
                          <Badge variant={idx === 0 ? "default" : "secondary"}>
                            {idx + 1}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold">{player.player_name}</TableCell>
                        {Array.from({ length: entry.num_games || 5 }, (_, i) => {
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
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="md:hidden space-y-3">
              {players.map((player, idx) => {
                const stats = calculatePlayerStats(player, entry.num_games || 5);
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

                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                        <span>Tap to {isExpanded ? "hide" : "view"} details</span>
                        <span>Games: {entry.num_games || 5}</span>
                      </div>

                      {isExpanded && (
                        <>
                          <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                            <div>
                              <span className="text-muted-foreground">Handicap:</span>
                              <span className="ml-2 font-semibold">{player.handicap ?? 0}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Total:</span>
                              <span className="ml-2 font-semibold">{stats.total_score}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Diff:</span>
                              <span className={`ml-2 font-semibold ${stats.differential > 0 ? "text-green-600" : "text-pink-600"}`}>
                                {stats.differential > 0 ? "+" : ""}{stats.differential}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Games:</span>
                              <span className="ml-2 font-semibold">{stats.games_played}</span>
                            </div>
                          </div>

                          <div>
                            <div className="text-xs text-muted-foreground mb-2">Game Scores:</div>
                            <div className="flex flex-wrap gap-2">
                              {Array.from({ length: entry.num_games || 5 }, (_, i) => {
                                const score = scores[`game_${i + 1}`] as number | null;
                                return (
                                  <Badge
                                    key={i}
                                    variant="secondary"
                                    className={
                                      score !== null && score > 0
                                        ? `${GAME_COLORS[i]} text-white`
                                        : "bg-rose-200"
                                    }
                                  >
                                    G{i + 1}: {score !== null && score > 0 ? score : "-"}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}