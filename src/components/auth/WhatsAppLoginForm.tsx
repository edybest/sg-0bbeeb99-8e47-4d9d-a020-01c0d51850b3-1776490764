import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MessageCircle } from "lucide-react";
import Image from "next/image";

export function WhatsAppLoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sendingTAC, setSendingTAC] = useState(false);
  const [tacSent, setTacSent] = useState(false);
  const [lastTacSentTime, setLastTacSentTime] = useState<number | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [formData, setFormData] = useState({
    phone: "",
    tac: "",
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

    if (!formData.phone) {
      toast({
        title: "Error",
        description: "Sila masukkan nombor telefon",
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
      // Call our backend to send TAC via WhatsApp
      const response = await fetch("/api/send-whatsapp-tac", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: cleanPhone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send TAC");
      }

      setFormData(prev => ({ ...prev, phone: cleanPhone }));

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
      const errorMessage = error instanceof Error ? error.message : "Gagal menghantar kod TAC. Sila cuba lagi.";
      
      toast({
        title: "Ralat",
        description: errorMessage,
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

    setLoading(true);

    try {
      // Call our custom verification API instead of Supabase's verifyOtp
      const response = await fetch("/api/verify-tac-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: formData.phone,
          code: formData.tac,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Verification failed");
      }

      if (!data.success) {
        throw new Error(data.error || "Login gagal");
      }

      // Set session using the returned tokens
      if (data.data?.access_token && data.data?.refresh_token) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.data.access_token,
          refresh_token: data.data.refresh_token,
        });

        if (sessionError) {
          console.error("Session creation error:", sessionError);
          throw new Error("Gagal mencipta sesi. Sila cuba lagi.");
        }

        console.log("✅ Session created successfully");
      } else {
        // Fallback: If no tokens, try to sign in with OTP
        // This shouldn't happen but kept for backward compatibility
        console.warn("⚠️ No tokens received from API");
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4 py-8">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="relative w-32 h-32">
              <Image
                src="/ambc-logo.png"
                alt="AMBC Club Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AMBC Club</h1>
          <p className="text-gray-600">Log Masuk Member</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Selamat Datang</h2>
            <p className="text-sm text-gray-500 mt-1">
              Login dengan WhatsApp TAC untuk keselamatan yang lebih baik
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Phone Field */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                Nombor WhatsApp
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="0123456789 atau +60123456789"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={loading || sendingTAC || tacSent}
                required
                className="h-11"
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
                className="w-full h-11 bg-green-600 hover:bg-green-700"
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
                  <Label htmlFor="tac" className="text-sm font-medium text-gray-700">
                    Kod TAC (6 digit)
                  </Label>
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
                    className="h-11 text-center text-2xl tracking-widest font-mono"
                  />
                  <p className="text-xs text-green-600 flex items-center justify-center">
                    ✓ Kod TAC telah dihantar ke WhatsApp anda
                  </p>
                </div>

                {/* Resend TAC Button */}
                <Button
                  type="button"
                  onClick={() => {
                    setTacSent(false);
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
                  className="w-full h-11 bg-blue-600 hover:bg-blue-700"
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

          {/* Footer */}
          <div className="text-center pt-4 border-t">
            <p className="text-xs text-gray-500">
              Masalah log masuk? Hubungi admin untuk bantuan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}