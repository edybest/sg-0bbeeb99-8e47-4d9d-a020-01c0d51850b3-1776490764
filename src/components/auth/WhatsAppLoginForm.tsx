import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MessageCircle } from "lucide-react";
import { sessionService } from "@/services/sessionService";

export function WhatsAppLoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sendingTAC, setSendingTAC] = useState(false);
  const [tacSent, setTacSent] = useState(false);
  const [lastTacSentTime, setLastTacSentTime] = useState<number | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [formData, setFormData] = useState({
    username: "",
    phone: "",
    tac: "",
    memberId: "",
  });

  // Cooldown timer effect
  useEffect(() => {
    if (lastTacSentTime && cooldownRemaining > 0) {
      const timer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - lastTacSentTime) / 1000);
        const remaining = Math.max(0, 120 - elapsed);
        setCooldownRemaining(remaining);
        
        if (remaining === 0) {
          clearInterval(timer);
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [lastTacSentTime, cooldownRemaining]);

  async function handleSendTAC() {
    // Check cooldown
    if (lastTacSentTime) {
      const elapsed = Math.floor((Date.now() - lastTacSentTime) / 1000);
      if (elapsed < 120) {
        const remaining = 120 - elapsed;
        toast({
          title: "Sila Tunggu",
          description: `Sila tunggu ${remaining} saat sebelum memohon kod TAC baru`,
          variant: "destructive",
        });
        return;
      }
    }

    if (!formData.username || !formData.phone) {
      toast({
        title: "Error",
        description: "Sila masukkan username dan nombor telefon",
        variant: "destructive",
      });
      return;
    }

    // Validate phone number format
    const phoneRegex = /^(\+?6?01)[0-46-9]-*[0-9]{7,8}$/;
    let cleanPhone = formData.phone.replace(/\s+/g, "").replace(/-/g, "");
    
    if (!cleanPhone.startsWith("+")) {
      if (cleanPhone.startsWith("01")) {
        cleanPhone = "+6" + cleanPhone;
      } else if (cleanPhone.startsWith("6")) {
        cleanPhone = "+" + cleanPhone;
      }
    }

    if (!phoneRegex.test(cleanPhone.replace("+", ""))) {
      toast({
        title: "Error",
        description: "Format nombor telefon tidak sah. Contoh: 0123456789 atau +60123456789",
        variant: "destructive",
      });
      return;
    }

    setSendingTAC(true);
    try {
      const response = await fetch("/api/send-whatsapp-tac", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          phone: cleanPhone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send TAC");
      }

      // Store memberId from response
      if (data.data?.memberId) {
        setFormData(prev => ({ ...prev, memberId: data.data.memberId, phone: cleanPhone }));
      }

      const now = Date.now();
      setLastTacSentTime(now);
      setCooldownRemaining(120);
      setTacSent(true);
      
      toast({
        title: "Kod TAC Dihantar",
        description: `Kod TAC telah dihantar ke WhatsApp ${cleanPhone}. Sila semak WhatsApp anda.`,
      });
    } catch (error: unknown) {
      console.error("Send TAC error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Gagal menghantar kod TAC",
        variant: "destructive",
      });
    } finally {
      setSendingTAC(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    if (!tacSent) {
      toast({
        title: "Sila hantar kod TAC dahulu",
        variant: "destructive",
      });
      return;
    }

    if (!formData.tac || formData.tac.length !== 6) {
      toast({
        title: "Sila masukkan kod TAC 6 digit",
        variant: "destructive",
      });
      return;
    }

    if (!formData.memberId) {
      toast({
        title: "Member ID tidak dijumpai",
        description: "Sila hantar kod TAC semula",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Verify TAC and create session
      const response = await fetch("/api/verify-tac-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: formData.memberId,
          code: formData.tac,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to verify TAC");
      }

      // Session cookie is set by API
      // Store session token in service for client-side access
      if (result.data?.sessionToken && result.data?.expiresAt) {
        sessionService.setSessionCookie(result.data.sessionToken, result.data.expiresAt);
      }

      toast({
        title: "Log masuk berjaya!",
        description: "Mengalihkan ke dashboard...",
      });

      // Redirect to member dashboard
      setTimeout(() => {
        router.push("/member");
      }, 500);

    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: "Ralat semasa log masuk",
        description: error.message || "Kod TAC tidak sah atau telah tamat tempoh",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto shadow-xl">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">Log Masuk Member</CardTitle>
        <CardDescription>
          Login dengan WhatsApp TAC untuk keselamatan yang lebih baik
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Username Field */}
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="Masukkan username anda"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              disabled={loading || sendingTAC || tacSent}
              required
            />
          </div>

          {/* Phone Field */}
          <div className="space-y-2">
            <Label htmlFor="phone">Nombor WhatsApp</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="0123456789 atau +60123456789"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              disabled={loading || sendingTAC || tacSent}
              required
            />
            <p className="text-xs text-gray-500">
              Format: 0123456789 atau +60123456789
            </p>
          </div>

          {/* Send TAC Button */}
          {!tacSent && (
            <Button
              type="button"
              onClick={handleSendTAC}
              disabled={sendingTAC || loading}
              className="w-full"
              variant="outline"
            >
              {sendingTAC ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menghantar...
                </>
              ) : (
                <>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Hantar Kod TAC ke WhatsApp
                </>
              )}
            </Button>
          )}

          {/* TAC Field - Only show after TAC sent */}
          {tacSent && (
            <>
              <div className="space-y-2">
                <Label htmlFor="tac">Kod TAC (6 digit)</Label>
                <Input
                  id="tac"
                  type="text"
                  placeholder="Masukkan kod TAC dari WhatsApp"
                  value={formData.tac}
                  onChange={(e) => setFormData({ ...formData, tac: e.target.value })}
                  disabled={loading}
                  maxLength={6}
                  pattern="[0-9]{6}"
                  required
                />
                <p className="text-xs text-green-600">
                  ✓ Kod TAC telah dihantar ke WhatsApp anda
                </p>
              </div>

              {/* Resend TAC Button */}
              <Button
                type="button"
                onClick={() => {
                  setTacSent(false);
                  setFormData(prev => ({ ...prev, tac: "", memberId: "" }));
                }}
                variant="ghost"
                className="w-full text-sm"
                disabled={loading || cooldownRemaining > 0}
              >
                {cooldownRemaining > 0 
                  ? `Tunggu ${cooldownRemaining}s untuk hantar semula`
                  : "Hantar semula kod TAC"
                }
              </Button>

              {/* Login Button */}
              <Button
                type="submit"
                disabled={loading || !formData.tac}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Log Masuk...
                  </>
                ) : (
                  "Log Masuk"
                )}
              </Button>
            </>
          )}
        </form>
      </CardContent>
    </Card>
  );
}