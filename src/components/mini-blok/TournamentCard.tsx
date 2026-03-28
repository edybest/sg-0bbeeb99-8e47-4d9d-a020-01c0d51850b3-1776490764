import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Users, Share2, Edit2, Trash2, Globe } from "lucide-react";
import { calculatePlayerStats, type MiniBlokWithPlayers } from "@/services/miniBlokService";
import { GAME_COLORS } from "./constants";

interface TournamentCardProps {
  entry: MiniBlokWithPlayers;
  memberId?: string;
  onShare: () => void;
  onManage: () => void;
  onDelete: () => void;
}

export function TournamentCard({
  entry,
  memberId,
  onShare,
  onManage,
  onDelete,
}: TournamentCardProps) {
  const [isPlayersExpanded, setIsPlayersExpanded] = useState(false);
  const [expandedPlayerScores, setExpandedPlayerScores] = useState<Record<string, boolean>>({});

  const sortedPlayers = [...entry.players].sort((a, b) => {
    const statsA = calculatePlayerStats(a, entry.num_games || 5);
    const statsB = calculatePlayerStats(b, entry.num_games || 5);
    return statsB.overall_score - statsA.overall_score;
  });

  return (
    <Card id={`entry-${entry.id}`} className="transition-all duration-300 hover:shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg mb-2 flex items-center gap-2">
              <span className="truncate">{entry.title}</span>
              {entry.share_token && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex-shrink-0 text-[10px] uppercase font-bold tracking-wider py-0 px-1.5 h-5">
                  <Globe className="h-3 w-3 mr-1" />
                  Public
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <MapPin className="h-4 w-4" />
              <span className="truncate">{entry.location}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Calendar className="h-4 w-4" />
              <span>{new Date(entry.date).toLocaleDateString("en-MY")}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{entry.players.length} players · {entry.num_games} games</span>
            </div>
          </div>

          <div className="flex gap-1 flex-shrink-0">
            <Button size="sm" variant="ghost" onClick={onShare}>
              <Share2 className="h-4 w-4" />
            </Button>
            {entry.can_edit && (
              <>
                <Button size="sm" variant="ghost" onClick={onManage}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                {entry.owner_id === memberId && (
                  <Button size="sm" variant="ghost" onClick={onDelete}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {entry.players.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No players yet
          </div>
        ) : (
          <div className="space-y-2">
            {sortedPlayers.slice(0, 3).map((player, idx) => {
              const stats = calculatePlayerStats(player, entry.num_games || 5);
              return (
                <div key={player.id} className="flex items-center justify-between bg-muted/50 rounded-lg p-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={idx === 0 ? "default" : "secondary"}>
                      {idx + 1}
                    </Badge>
                    <span className="font-semibold truncate">{player.player_name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-pink-600">
                      {stats.overall_score}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Avg: {stats.average}
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="pt-1">
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-between"
                onClick={() => setIsPlayersExpanded(!isPlayersExpanded)}
              >
                <span className="text-sm">
                  {isPlayersExpanded
                    ? "Hide full scores"
                    : `View full scores (${entry.players.length} players)`}
                </span>
                <span className="text-xs text-muted-foreground">
                  Games: {entry.num_games}
                </span>
              </Button>
            </div>

            {isPlayersExpanded && (
              <div className="mt-2 space-y-2">
                {sortedPlayers.map((player, idx) => {
                  const scores = (player.scores as Record<string, number>) || {};
                  const stats = calculatePlayerStats(player, entry.num_games || 5);
                  const isExpanded = !!expandedPlayerScores[player.id];

                  return (
                    <div key={player.id} className="rounded-lg border bg-background">
                      <button
                        type="button"
                        className="w-full px-3 py-2 flex items-center justify-between gap-3"
                        onClick={() =>
                          setExpandedPlayerScores((prev) => ({
                            ...prev,
                            [player.id]: !prev[player.id],
                          }))
                        }
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <Badge variant={idx === 0 ? "default" : "secondary"} className="shrink-0">
                              #{idx + 1}
                            </Badge>
                            <span className="font-semibold truncate">
                              {player.player_name}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground text-left mt-0.5">
                            HCP: {player.handicap ?? 0} · Avg: {stats.average} · Overall: {stats.overall_score}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {isExpanded ? "Hide" : "View"}
                        </span>
                      </button>

                      {isExpanded && (
                        <div className="border-t px-3 py-2">
                          <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                            <div>
                              <span className="text-muted-foreground">Handicap:</span>
                              <span className="ml-2 font-semibold">
                                {player.handicap ?? 0}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Total:</span>
                              <span className="ml-2 font-semibold">
                                {stats.total_score}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {Array.from({ length: entry.num_games || 5 }, (_, i) => i + 1).map((gameNum) => {
                              const score = scores[`game_${gameNum}`] as number | null;
                              return (
                                <Badge
                                  key={gameNum}
                                  variant="secondary"
                                  className={
                                    score !== null && typeof score === "number" && score > 0
                                      ? `${GAME_COLORS[gameNum - 1]} text-white`
                                      : "bg-rose-200"
                                  }
                                >
                                  G{gameNum}: {score !== null && score > 0 ? score : "-"}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}