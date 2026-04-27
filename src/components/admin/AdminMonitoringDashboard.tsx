import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/database.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Bell, Calendar, Loader2, MessageSquare, Users } from "lucide-react";

type GameRow = Pick<
  Database["public"]["Tables"]["games"]["Row"],
  "id" | "game_name" | "game_date" | "location" | "is_official"
>;

type QueueRow = Pick<
  Database["public"]["Tables"]["blok_join_queue"]["Row"],
  "game_id" | "member_id" | "queue_group" | "source_type" | "created_at" | "queue_position"
>;

type MemberRow = Pick<
  Database["public"]["Tables"]["members"]["Row"],
  "id" | "user_id" | "is_verified" | "phone" | "created_at"
>;

type SessionRow = Pick<
  Database["public"]["Tables"]["member_sessions"]["Row"],
  "member_id" | "last_accessed_at"
>;

type PushRow = Pick<
  Database["public"]["Tables"]["push_subscriptions"]["Row"],
  "member_id"
>;

type RecentGameSummary = GameRow & {
  totalCount: number;
  waitingCount: number;
  active: boolean;
};

type MonitoringState = {
  activeGame: GameRow | null;
  totalQueueEntries: number;
  mainQueueCount: number;
  waitingQueueCount: number;
  joinRequestCount: number;
  unmatchedImportCount: number;
  latestQueueActivity: string | null;
  totalMembers: number;
  verifiedMembers: number;
  linkedMembers: number;
  whatsappReadyMembers: number;
  activeSessionMembers: number;
  pushEnabledMembers: number;
  recentMembers: number;
  recentGames: RecentGameSummary[];
};

const EMPTY_STATE: MonitoringState = {
  activeGame: null,
  totalQueueEntries: 0,
  mainQueueCount: 0,
  waitingQueueCount: 0,
  joinRequestCount: 0,
  unmatchedImportCount: 0,
  latestQueueActivity: null,
  totalMembers: 0,
  verifiedMembers: 0,
  linkedMembers: 0,
  whatsappReadyMembers: 0,
  activeSessionMembers: 0,
  pushEnabledMembers: 0,
  recentMembers: 0,
  recentGames: [],
};

function isPhoneReady(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 12;
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("ms-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatGameDate(value: string): string {
  return new Date(value).toLocaleDateString("ms-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatPercent(value: number, total: number): string {
  if (!total) {
    return "0%";
  }

  return `${Math.round((value / total) * 100)}%`;
}

export function AdminMonitoringDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [state, setState] = useState<MonitoringState>(EMPTY_STATE);

  useEffect(() => {
    void loadDashboard(false);
  }, []);

  async function loadDashboard(manual: boolean) {
    try {
      if (manual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [
        activeSettingResult,
        recentGamesResult,
        membersResult,
        sessionsResult,
        pushResult,
      ] = await Promise.all([
        supabase
          .from("club_settings")
          .select("setting_value")
          .eq("setting_key", "blok_join_active_game_id")
          .maybeSingle(),
        supabase
          .from("games")
          .select("id, game_name, game_date, location, is_official")
          .eq("game_type", "BLOK")
          .order("game_date", { ascending: false })
          .limit(5),
        supabase.from("members").select("id, user_id, is_verified, phone, created_at"),
        supabase.from("member_sessions").select("member_id, last_accessed_at"),
        supabase.from("push_subscriptions").select("member_id"),
      ]);

      if (activeSettingResult.error) throw activeSettingResult.error;
      if (recentGamesResult.error) throw recentGamesResult.error;
      if (membersResult.error) throw membersResult.error;
      if (sessionsResult.error) throw sessionsResult.error;
      if (pushResult.error) throw pushResult.error;

      const recentGames = (recentGamesResult.data || []) as GameRow[];
      const members = (membersResult.data || []) as MemberRow[];
      const sessions = (sessionsResult.data || []) as SessionRow[];
      const pushSubscriptions = (pushResult.data || []) as PushRow[];
      const activeGameId = activeSettingResult.data?.setting_value || null;

      let activeGame = recentGames.find((game) => game.id === activeGameId) || null;

      if (activeGameId && !activeGame) {
        const activeGameResult = await supabase
          .from("games")
          .select("id, game_name, game_date, location, is_official")
          .eq("id", activeGameId)
          .maybeSingle();

        if (activeGameResult.error) throw activeGameResult.error;
        activeGame = (activeGameResult.data as GameRow | null) || null;
      }

      let activeQueue: QueueRow[] = [];

      if (activeGameId) {
        const activeQueueResult = await supabase
          .from("blok_join_queue")
          .select("game_id, member_id, queue_group, source_type, created_at, queue_position")
          .eq("game_id", activeGameId)
          .order("queue_position", { ascending: true });

        if (activeQueueResult.error) throw activeQueueResult.error;
        activeQueue = (activeQueueResult.data || []) as QueueRow[];
      }

      const recentGameIds = recentGames.map((game) => game.id);
      let recentQueueRows: Array<Pick<QueueRow, "game_id" | "queue_group">> = [];

      if (recentGameIds.length > 0) {
        const recentQueueResult = await supabase
          .from("blok_join_queue")
          .select("game_id, queue_group")
          .in("game_id", recentGameIds);

        if (recentQueueResult.error) throw recentQueueResult.error;
        recentQueueRows = recentQueueResult.data || [];
      }

      const recentQueueCounts = new Map<string, { total: number; waiting: number }>();

      for (const row of recentQueueRows) {
        const current = recentQueueCounts.get(row.game_id) || { total: 0, waiting: 0 };
        current.total += 1;
        if (row.queue_group === "waiting") {
          current.waiting += 1;
        }
        recentQueueCounts.set(row.game_id, current);
      }

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const mainQueueCount = activeQueue.filter((entry) => entry.queue_group === "main").length;
      const waitingQueueCount = activeQueue.filter((entry) => entry.queue_group === "waiting").length;
      const joinRequestCount = activeQueue.filter((entry) => entry.source_type === "join_request").length;
      const unmatchedImportCount = activeQueue.filter(
        (entry) => entry.source_type === "admin_import" && !entry.member_id
      ).length;

      const recentGamesSummary: RecentGameSummary[] = recentGames.map((game) => {
        const counts = recentQueueCounts.get(game.id) || { total: 0, waiting: 0 };

        return {
          ...game,
          totalCount: counts.total,
          waitingCount: counts.waiting,
          active: game.id === activeGameId,
        };
      });

      setState({
        activeGame,
        totalQueueEntries: activeQueue.length,
        mainQueueCount,
        waitingQueueCount,
        joinRequestCount,
        unmatchedImportCount,
        latestQueueActivity: activeQueue[activeQueue.length - 1]?.created_at || null,
        totalMembers: members.length,
        verifiedMembers: members.filter((member) => Boolean(member.is_verified)).length,
        linkedMembers: members.filter((member) => Boolean(member.user_id)).length,
        whatsappReadyMembers: members.filter((member) => isPhoneReady(member.phone)).length,
        activeSessionMembers: new Set(sessions.map((session) => session.member_id)).size,
        pushEnabledMembers: new Set(pushSubscriptions.map((subscription) => subscription.member_id)).size,
        recentMembers: members.filter((member) => new Date(member.created_at) >= thirtyDaysAgo).length,
        recentGames: recentGamesSummary,
      });
    } catch (error) {
      console.error("Error loading admin monitoring dashboard:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <Card key={item} className="animate-pulse border-0 shadow-md">
            <CardHeader className="space-y-3">
              <div className="h-4 w-28 rounded bg-slate-200"></div>
              <div className="h-8 w-20 rounded bg-slate-200"></div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  const overviewCards = [
    {
      title: "Queue Aktif",
      value: state.totalQueueEntries.toString(),
      subtitle: state.activeGame ? state.activeGame.game_name : "Tiada game BLOK aktif",
      icon: MessageSquare,
      tone: "text-sky-600 bg-sky-50",
    },
    {
      title: "Slot Utama",
      value: `${state.mainQueueCount}/42`,
      subtitle: `${state.waitingQueueCount} dalam waiting list`,
      icon: Bell,
      tone: "text-emerald-600 bg-emerald-50",
    },
    {
      title: "Ahli Disahkan",
      value: `${state.verifiedMembers}/${state.totalMembers}`,
      subtitle: `${formatPercent(state.verifiedMembers, state.totalMembers)} daripada semua ahli`,
      icon: Users,
      tone: "text-violet-600 bg-violet-50",
    },
    {
      title: "Akaun Terhubung",
      value: `${state.linkedMembers}`,
      subtitle: `${state.activeSessionMembers} ahli ada sesi aktif`,
      icon: BarChart3,
      tone: "text-amber-600 bg-amber-50",
    },
  ];

  const memberCoverage = [
    {
      label: "Nombor sedia WhatsApp",
      value: state.whatsappReadyMembers,
      helper: `${formatPercent(state.whatsappReadyMembers, state.totalMembers)} coverage`,
    },
    {
      label: "Push notification aktif",
      value: state.pushEnabledMembers,
      helper: `${formatPercent(state.pushEnabledMembers, state.totalMembers)} ahli`,
    },
    {
      label: "Ahli baharu 30 hari",
      value: state.recentMembers,
      helper: "Pendaftaran terkini",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-sky-900 p-6 text-white shadow-lg lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-sky-100">
            <Bell className="h-4 w-4" />
            Admin monitoring dashboard
          </div>
          <h2 className="text-2xl font-bold">Pantau queue WhatsApp dan kesiapsiagaan ahli</h2>
          <p className="max-w-2xl text-sm text-slate-200">
            Ringkasan ini menggunakan data queue BLOK aktif, status verifikasi ahli, sesi login, dan subscription
            push yang sudah wujud dalam sistem admin.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => void loadDashboard(true)}
          disabled={refreshing}
          className="border-white/20 bg-white/10 text-white hover:bg-white/20"
        >
          {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BarChart3 className="mr-2 h-4 w-4" />}
          Refresh dashboard
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {overviewCards.map((card) => (
          <Card key={card.title} className="border-0 shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600">{card.title}</CardTitle>
                <div className={`rounded-lg p-2 ${card.tone}`}>
                  <card.icon className="h-5 w-5" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">{card.value}</p>
              <p className="mt-1 text-xs text-slate-500">{card.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-sky-600" />
              Aktiviti queue WhatsApp
            </CardTitle>
            <CardDescription>Berpandukan queue BLOK aktif yang disimpan dalam sistem</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {state.activeGame ? (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100">Game aktif</Badge>
                  {state.activeGame.is_official ? (
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Official</Badge>
                  ) : (
                    <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">Biasa</Badge>
                  )}
                  <span className="text-sm text-slate-600">
                    {state.activeGame.game_name} • {formatGameDate(state.activeGame.game_date)}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Join request</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{state.joinRequestCount}</p>
                    <p className="text-xs text-slate-500">Ahli yang masuk melalui command WhatsApp</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Import belum padan</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{state.unmatchedImportCount}</p>
                    <p className="text-xs text-slate-500">Nama import admin yang belum linked ke ahli</p>
                  </div>
                </div>

                <div className="rounded-xl border border-dashed border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Calendar className="h-4 w-4 text-sky-600" />
                    Aktiviti terakhir queue
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{formatDateTime(state.latestQueueActivity)}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Lokasi: {state.activeGame.location || "Belum ditetapkan"}
                  </p>
                </div>
              </>
            ) : (
              <div className="rounded-xl bg-slate-50 p-5 text-sm text-slate-600">
                Tiada `blok_join_active_game_id` aktif dalam `club_settings`, jadi queue WhatsApp belum dipromosikan
                sebagai senarai semasa.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-sky-600" />
              Status ahli
            </CardTitle>
            <CardDescription>Liputan verifikasi, auth, dan readiness untuk notifikasi</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-700">Verified members</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{state.verifiedMembers}</p>
              <p className="text-xs text-slate-500">
                {formatPercent(state.verifiedMembers, state.totalMembers)} daripada {state.totalMembers} ahli
              </p>
            </div>

            {memberCoverage.map((item) => (
              <div key={item.label} className="flex items-start justify-between rounded-xl border border-slate-100 p-4">
                <div>
                  <p className="text-sm font-medium text-slate-700">{item.label}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.helper}</p>
                </div>
                <span className="text-lg font-bold text-slate-900">{item.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-sky-600" />
            BLOK terkini dan saiz queue
          </CardTitle>
          <CardDescription>5 game BLOK terbaru untuk semak momentum group dan waiting list</CardDescription>
        </CardHeader>
        <CardContent>
          {state.recentGames.length === 0 ? (
            <div className="rounded-xl bg-slate-50 p-5 text-sm text-slate-600">
              Belum ada game BLOK direkodkan.
            </div>
          ) : (
            <div className="space-y-3">
              {state.recentGames.map((game) => (
                <div
                  key={game.id}
                  className="flex flex-col gap-3 rounded-xl bg-gradient-to-r from-slate-50 to-sky-50 p-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">{game.game_name}</p>
                      {game.active ? (
                        <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100">Aktif</Badge>
                      ) : null}
                    </div>
                    <p className="text-sm text-slate-600">
                      {formatGameDate(game.game_date)} • {game.location || "Lokasi belum ditetapkan"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                    <span className="rounded-full bg-white px-3 py-1 shadow-sm">{game.totalCount} dalam queue</span>
                    <span className="rounded-full bg-white px-3 py-1 shadow-sm">{game.waitingCount} waiting</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}