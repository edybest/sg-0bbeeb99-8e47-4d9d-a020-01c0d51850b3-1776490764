import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { pageAccessService } from "@/services/pageAccessService";
import { Loader2, MessageCircle } from "lucide-react";
import Image from "next/image";

const TAC_COOLDOWN_KEY = "tac_cooldown_timestamp";
const COOLDOWN_DURATION = 90; // 90 seconds

function normalizePhone(phone: string) {
  let value = phone.replace(/\s+/g, "").replace(/-/g, "");

  if (!value.startsWith("+")) {
    if (value.startsWith("01")) {
      value = `+6${value}`;
    } else if (value.startsWith("6")) {
      value = `+${value}`;
    }
  }

  return value;
}

function isValidMalaysiaPhone(phone: string) {
  return /^\+601[0-46-9][0-9]{7,8}$/.test(phone);
}

function getCooldownRemaining(): number {
  if (typeof window === "undefined") return 0;
  
  const storedTimestamp = localStorage.getItem(TAC_COOLDOWN_KEY);
  if (!storedTimestamp) return 0;

  const lastTacTime = parseInt(storedTimestamp, 10);
  const elapsed = Math.floor((Date.now() - lastTacTime) / 1000);
  return Math.max(0, COOLDOWN_DURATION - elapsed);
}

function setCooldownTimestamp() {
  if (typeof window === "undefined") return;
  localStorage.setItem(TAC_COOLDOWN_KEY, Date.now().toString());
}

function clearCooldownTimestamp() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TAC_COOLDOWN_KEY);
}

export function WhatsAppLoginForm() {
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [sendingTAC, setSendingTAC] = useState(false);
  const [tacSent, setTacSent] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  const [formData, setFormData] = useState({
    phone: "",
    tac: ""
  });

  // Initialize cooldown from localStorage on mount
  useEffect(() => {
    const remaining = getCooldownRemaining();
    setCooldownRemaining(remaining);
    
    if (remaining > 0) {
      setTacSent(true);
    }
  }, []);

  // Countdown timer
  useEffect(() => {
    if (cooldownRemaining <= 0) return;

    const interval = setInterval(() => {
      const remaining = getCooldownRemaining();
      setCooldownRemaining(remaining);

      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldownRemaining]);

  async function handleSendTAC() {
    const normalizedPhone = normalizePhone(formData.phone);

    if (!formData.phone.trim()) {
      toast({
        title: "Error",
        description: "Sila masukkan nombor telefon",
        variant: "destructive"
      });
      return;
    }

    const remaining = getCooldownRemaining();
    if (remaining > 0) {
      toast({
        title: "Sila Tunggu",
        description: `Sila tunggu ${remaining} saat sebelum memohon kod TAC baru`,
        variant: "destructive"
      });
      return;
    }

    if (!isValidMalaysiaPhone(normalizedPhone)) {
      toast({
        title: "Error",
        description: "Format nombor telefon tidak sah. Contoh: 0123456789 atau +60123456789",
        variant: "destructive"
      });
      return;
    }

    setSendingTAC(true);

    try {
      const response = await fetch("/api/send-whatsapp-tac", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizedPhone })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send TAC");
      }

      setFormData((prev) => ({
        ...prev,
        phone: normalizedPhone,
        tac: ""
      }));
      
      // Set cooldown in localStorage
      setCooldownTimestamp();
      setCooldownRemaining(COOLDOWN_DURATION);
      setTacSent(true);

      toast({
        title: "Kod TAC Dihantar",
        description: `Kod TAC telah dihantar ke WhatsApp ${normalizedPhone}. Sila semak WhatsApp anda.`
      });
    } catch (error: unknown) {
      console.error("Send TAC error:", error);

      toast({
        title: "Ralat",
        description:
          error instanceof Error
            ? error.message
            : "Gagal menghantar kod TAC. Sila cuba lagi.",
        variant: "destructive"
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
        variant: "destructive"
      });
      return;
    }

    // Validate TAC code format
    if (!/^\d{6}$/.test(formData.tac)) {
      toast({
        title: "Kod TAC tidak sah",
        description: "Sila masukkan kod TAC 6 digit",
        variant: "destructive"
      });
      return;
    }

    // Validate phone number exists and is properly formatted
    if (!formData.phone || !formData.phone.trim()) {
      toast({
        title: "Ralat",
        description: "Nombor telefon tidak dijumpai. Sila hantar kod TAC semula.",
        variant: "destructive"
      });
      setTacSent(false);
      return;
    }

    setLoading(true);

    try {
      console.log("🔐 Submitting login with:", {
        phone: formData.phone,
        code: formData.tac,
        phoneLength: formData.phone.length,
        codeLength: formData.tac.length
      });

      const response = await fetch("/api/verify-tac-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: formData.phone,
          code: formData.tac
        })
      });

      const data = await response.json();

      console.log("🔍 Verify TAC Response:", {
        status: response.status,
        ok: response.ok,
        data: data
      });

      if (!response.ok) {
        console.error("❌ Verify TAC Failed:", {
          status: response.status,
          error: data.error,
          message: data.message,
          fullData: data
        });
        throw new Error(data.error || "Verification failed");
      }

      if (!data.success) {
        console.error("❌ Verify TAC Not Successful:", data);
        throw new Error(data.error || "Verification failed");
      }

      if (data.data?.access_token && data.data?.refresh_token) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.data.access_token,
          refresh_token: data.data.refresh_token
        });

        if (sessionError) {
          throw new Error("Gagal mencipta sesi. Sila cuba lagi.");
        }

        // ✅ Wait until session is actually readable (prevents redirect loop to /login)
        let sessionOk = false;
        for (let i = 0; i < 5; i++) {
          const { data: sessionData, error: sessionReadError } = await supabase.auth.getSession();
          if (!sessionReadError && sessionData.session) {
            sessionOk = true;
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 150));
        }

        if (!sessionOk) {
          throw new Error("Sesi log masuk belum sedia. Sila cuba lagi.");
        }
      } else {
        throw new Error("Token sesi tidak diterima dari server.");
      }

      // Clear cooldown on successful login
      clearCooldownTimestamp();

      // Clear any cached role/page access decisions to avoid stale redirects
      pageAccessService.clearCache();

      toast({
        title: "Log masuk berjaya!",
        description: "Mengalihkan ke dashboard..."
      });

      await router.push("/member");
    } catch (error: unknown) {
      console.error("Login error:", error);

      toast({
        title: "Ralat semasa log masuk",
        description:
          error instanceof Error
            ? error.message
            : "Kod TAC tidak sah atau telah tamat tempoh",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4 py-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="relative w-32 h-32">
              <Image
                src="/ambc-logo.png"
                alt="AMBC Club Logo"
                fill
                sizes="128px"
                className="object-contain"
                priority
              />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AMBC Club</h1>
          <p className="text-gray-600">Log Masuk Member</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Selamat Datang</h2>
            <p className="text-sm text-gray-500 mt-1">
              Login dengan WhatsApp TAC untuk akses ke Member Area
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                Nombor WhatsApp
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="0123456789 atau +60123456789"
                value={formData.phone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, phone: e.target.value }))
                }
                disabled={loading || sendingTAC || tacSent}
                required
                className="h-11"
              />
              <p className="text-xs text-gray-500">
                Format: 0123456789 atau +60123456789
              </p>
            </div>

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

            {tacSent && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="tac" className="text-sm font-medium text-gray-700">
                    Kod TAC (6 digit)
                  </Label>
                  <Input
                    id="tac"
                    type="text"
                    inputMode="numeric"
                    placeholder="Masukkan kod TAC dari WhatsApp"
                    value={formData.tac}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        tac: e.target.value.replace(/\D/g, "").slice(0, 6)
                      }))
                    }
                    disabled={loading}
                    maxLength={6}
                    required
                    className="h-11 text-center text-2xl tracking-widest font-mono"
                  />
                  <p className="text-xs text-green-600 flex items-center justify-center">
                    ✓ Kod TAC telah dihantar ke WhatsApp anda
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={handleSendTAC}
                  variant="ghost"
                  className="w-full text-sm"
                  disabled={loading || sendingTAC || cooldownRemaining > 0}
                >
                  {cooldownRemaining > 0
                    ? `Tunggu ${cooldownRemaining}s untuk hantar semula`
                    : "Hantar semula kod TAC"}
                </Button>

                <Button
                  type="submit"
                  disabled={loading || formData.tac.length !== 6}
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

          <div className="text-center pt-4 border-t">
            <p className="text-xs text-gray-500">
              Masalah log masuk? Hubungi admin untuk bantuan,TQ.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}