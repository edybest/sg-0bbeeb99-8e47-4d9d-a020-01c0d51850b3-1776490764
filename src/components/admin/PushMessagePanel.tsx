import { useEffect, useMemo, useState } from "react";
import { notificationService, type NotificationAudience } from "@/services/notificationService";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Send } from "lucide-react";

type MemberRow = { id: string; full_name: string | null; username: string | null; phone: string | null };

type AudienceMode = "all" | "selected" | "blok_by_date";

function formatMember(m: MemberRow) {
  const name = m.full_name?.trim() || m.username?.trim() || m.phone?.trim() || m.id;
  return name;
}

export function PushMessagePanel() {
  const { toast } = useToast();

  const [title, setTitle] = useState("Pengumuman AMBC");
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<AudienceMode>("all");
  const [sending, setSending] = useState(false);

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [blokDate, setBlokDate] = useState<string>("");

  useEffect(() => {
    async function loadMembers() {
      const { data, error } = await supabase.from("members").select("id, full_name, username, phone").order("full_name");
      if (!error) setMembers((data as MemberRow[]) ?? []);
    }
    void loadMembers();
  }, []);

  const selectedPreview = useMemo(() => {
    if (selected.length === 0) return "Tiada ahli dipilih";
    const map = new Map(members.map((m) => [m.id, m]));
    return (
      selected
        .slice(0, 3)
        .map((id) => formatMember(map.get(id) as MemberRow))
        .join(", ") + (selected.length > 3 ? ` +${selected.length - 3} lagi` : "")
    );
  }, [members, selected]);

  function buildAudience(): NotificationAudience {
    if (mode === "all") return { type: "all_members" };
    if (mode === "selected") return { type: "selected_members", memberIds: selected };
    return { type: "blok_players_by_date", date: blokDate };
  }

  async function handleSend() {
    setSending(true);
    try {
      if (!message.trim()) {
        toast({ title: "Ralat", description: "Message tidak boleh kosong", variant: "destructive" });
        return;
      }

      if (mode === "selected" && selected.length === 0) {
        toast({ title: "Ralat", description: "Sila pilih sekurang-kurangnya 1 ahli", variant: "destructive" });
        return;
      }

      if (mode === "blok_by_date" && !blokDate) {
        toast({ title: "Ralat", description: "Sila pilih tarikh blok", variant: "destructive" });
        return;
      }

      const audience = buildAudience();
      await notificationService.createNotification({ title, message, audience });

      toast({ title: "✅ Berjaya", description: "Message telah dihantar (in-app)" });
      setMessage("");
      setSelected([]);
      setBlokDate("");
    } catch (e: unknown) {
      console.error("Send message failed:", e);
      toast({
        title: "❌ Ralat",
        description: e instanceof Error ? e.message : "Gagal hantar message",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Push Message (In-App)</CardTitle>
        <p className="text-sm text-muted-foreground">
          Hantar pengumuman kepada semua ahli / ahli tertentu / pemain Blok ikut tarikh.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="push-title">Title</Label>
          <Input id="push-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="push-body">Message</Label>
          <Textarea id="push-body" value={message} onChange={(e) => setMessage(e.target.value)} rows={5} />
        </div>

        <div className="space-y-2">
          <Label>Audience</Label>
          <Select value={mode} onValueChange={(v: AudienceMode) => setMode(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih audience" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua ahli</SelectItem>
              <SelectItem value="selected">Selected ahli</SelectItem>
              <SelectItem value="blok_by_date">Pemain Blok ikut tarikh</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {mode === "selected" && (
          <div className="space-y-2">
            <Label>Pilih ahli</Label>
            <div className="grid gap-2 md:grid-cols-2">
              {members.slice(0, 50).map((m) => {
                const isChecked = selected.includes(m.id);
                return (
                  <label key={m.id} className="flex cursor-pointer items-center gap-2 rounded border p-2 text-sm">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? Array.from(new Set([...selected, m.id]))
                          : selected.filter((id) => id !== m.id);
                        setSelected(next);
                      }}
                    />
                    <span className="truncate">{formatMember(m)}</span>
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">Preview: {selectedPreview}</p>
            {members.length > 50 && (
              <p className="text-xs text-muted-foreground">
                Nota: Untuk performance, list dipaparkan 50 ahli pertama. Jika nak search/filter, saya boleh tambah.
              </p>
            )}
          </div>
        )}

        {mode === "blok_by_date" && (
          <div className="space-y-2">
            <Label htmlFor="blok-date">Tarikh Blok</Label>
            <Input id="blok-date" type="date" value={blokDate} onChange={(e) => setBlokDate(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              Sistem akan select pemain yang terlibat dalam Blok pada tarikh ini.
            </p>
          </div>
        )}

        <Button onClick={handleSend} disabled={sending} className="w-full">
          {sending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Send Message
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}