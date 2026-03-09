import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MessageCircle } from "lucide-react";
import { authService } from "@/services/authService";
import { supabase } from "@/integrations/supabase/client";

export function WhatsAppLoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sendingTAC, setSendingTAC] = useState(false);
  const [tacSent, setTacSent] = useState(false);
  const [serverTacCode, setServerTacCode] = useState(""); // Store TAC from server
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
        const remaining = Math.max(0, 120 - elapsed); // 2 minutes = 120 seconds
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

    // Validate phone number format (Malaysian format)
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

      // Store TAC code and memberId from server response
      if (data.data?.code) {
        setServerTacCode(data.data.code);
      }
      if (data.data?.memberId) {
        setFormData(prev => ({ ...prev, memberId: data.data.memberId }));
      }

      const now = Date.now();
      setLastTacSentTime(now);
      setCooldownRemaining(120);
      setTacSent(true);
      toast({
        title: "Kod TAC Dihantar",
        description: `Kod TAC telah dihantar ke WhatsApp ${cleanPhone}. Sila semak WhatsApp anda.`,
      });

      // Update phone with clean format
      setFormData(prev => ({ ...prev, phone: cleanPhone }));
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
        title: "❌ Sila hantar kod TAC dahulu",
        variant: "destructive",
      });
      return;
    }

    if (!formData.tac || formData.tac.length !== 6) {
      toast({
        title: "❌ Sila masukkan kod TAC 6 digit",
        variant: "destructive",
      });
      return;
    }

    if (!formData.memberId) {
      toast({
        title: "❌ Member ID tidak dijumpai",
        description: "Sila hantar kod TAC semula",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      console.log("=== LOGIN ATTEMPT START ===");
      console.log("Member ID:", formData.memberId);
      console.log("TAC Code:", formData.tac);

      // Verify TAC and establish session
      const { data: authData, error: authError } = await authService.verifyWhatsAppTAC(
        formData.memberId,
        formData.tac
      );

      if (authError) {
        console.error("❌ TAC Verification Error:", authError);
        toast({
          title: "❌ Kod TAC tidak sah",
          description: authError.message,
          variant: "destructive",
        });
        return;
      }

      console.log("✅ TAC verified, session data:", authData?.session ? "EXISTS" : "NULL");

      // CRITICAL: Verify session was actually created
      const { data: { session: verifySession } } = await supabase.auth.getSession();
      console.log("=== SESSION VERIFICATION ===");
      console.log("Session exists:", !!verifySession);
      console.log("User ID:", verifySession?.user?.id);
      console.log("User email:", verifySession?.user?.email);
      console.log("Access token:", verifySession?.access_token ? "EXISTS" : "NULL");
      console.log("Expires at:", verifySession?.expires_at);

      if (!verifySession) {
        console.error("❌ CRITICAL: Session not found after login!");
        toast({
          title: "❌ Session Error",
          description: "Session tidak dapat diwujudkan. Sila cuba lagi atau hubungi admin.",
          variant: "destructive",
        });
        return;
      }

      console.log("✅ Session verified successfully!");
      
      toast({
        title: "✅ Log masuk berjaya!",
        description: "Mengalihkan ke dashboard...",
      });

      // Small delay to ensure session is fully persisted
      setTimeout(() => {
        console.log("=== REDIRECTING TO /member ===");
        router.push("/member");
      }, 500);

    } catch (error: any) {
      console.error("❌ Login Error:", error);
      toast({
        title: "❌ Ralat semasa log masuk",
        description: error.message || "Sila cuba lagi",
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
                  setServerTacCode("");
                  setFormData(prev => ({ ...prev, tac: "" }));
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