import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { biometricAuthService } from "@/services/biometricAuthService";
import { Loader2, MessageCircle } from "lucide-react";

const TAC_COOLDOWN_KEY = "tac_cooldown_timestamp";
const TAC_PHONE_KEY = "tac_phone_last";
const COOLDOWN_DURATION = 90;
const VERIFICATION_TIMEOUT = 120000;
const TRUSTED_UNLOCK_SESSION_KEY = "ambc_biometric_unlocked_user";

type TrustedPromptUser = {
  id: string;
  label: string;
};

function combinePhone(code: string, phone: string) {
  let value = phone.replace(/\D/g, "");

  if (value.startsWith("0")) {
    value = value.substring(1);
  }

  const codeDigits = code.replace("+", "");
  if (value.startsWith(codeDigits) && value.length > codeDigits.length + 5) {
    value = value.substring(codeDigits.length);
  }

  return value ? code + value : "";
}

function isValidPhone(phone: string) {
  return /^\+(60|65)\d{8,10}$/.test(phone);
}

function getCooldownRemaining() {
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

function setLastTacPhone(phone: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TAC_PHONE_KEY, phone);
}

function getLastTacPhone() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(TAC_PHONE_KEY) || "";
}

function markTrustedSessionUnlocked(userId: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(TRUSTED_UNLOCK_SESSION_KEY, userId);
}

function LoginShell({
  children,
  error,
}: {
  children: React.ReactNode;
  error: string | null;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-background to-purple-50 px-4 py-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="relative mx-auto mb-6 h-24 w-24 sm:h-28 sm:w-28">
            <Image
              src="/ambc-logo.png"
              alt="AMBC Logo"
              width={96}
              height={96}
              className="mx-auto rounded-lg"
              priority
              unoptimized
            />
          </div>
        </div>

        <div className="rounded-2xl bg-card p-8 shadow-xl">
          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-center text-sm text-red-600">
              {error}
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

export function WhatsAppLoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sendingTAC, setSendingTAC] = useState(false);
  const [tacSent, setTacSent] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [countryCode, setCountryCode] = useState("+60");
  const [trustedPromptUser, setTrustedPromptUser] = useState<TrustedPromptUser | null>(null);
  const [enablingTrustedDevice, setEnablingTrustedDevice] = useState(false);
  const [formData, setFormData] = useState({
    phone: "",
    tac: "",
  });

  useEffect(() => {
    const remaining = getCooldownRemaining();
    setCooldownRemaining(remaining);

    if (remaining <= 0) return;

    setTacSent(true);
    const lastPhone = getLastTacPhone();

    if (lastPhone.startsWith("+65")) {
      setCountryCode("+65");
      setFormData((prev) => ({ ...prev, phone: lastPhone.substring(3) }));
      return;
    }

    if (lastPhone.startsWith("+60")) {
      setCountryCode("+60");
      setFormData((prev) => ({ ...prev, phone: lastPhone.substring(3) }));
    }
  }, []);

  useEffect(() => {
    if (cooldownRemaining <= 0) return;

    const interval = window.setInterval(() => {
      const remaining = getCooldownRemaining();
      setCooldownRemaining(remaining);

      if (remaining === 0) {
        window.clearInterval(interval);
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [cooldownRemaining]);

  const completeLoginRedirect = useCallback(async () => {
    toast({
      title: "Log masuk berjaya!",
      description: "Mengalihkan ke dashboard...",
    });

    if (typeof window !== "undefined" && "caches" in window) {
      try {
        const cacheKeys = await caches.keys();
        await Promise.all(
          cacheKeys.map((key) => {
            if (key.includes("ambc-club")) {
              return caches.delete(key);
            }
            return Promise.resolve(false);
          }),
        );
      } catch (cacheError) {
        console.warn("Failed to clear service worker caches", cacheError);
      }
    }

    const pendingSharePath = typeof window !== "undefined"
      ? sessionStorage.getItem("pending_share_redirect")
      : null;

    if (pendingSharePath) {
      sessionStorage.removeItem("pending_share_redirect");
      await router.push(pendingSharePath);
      return;
    }

    await router.push("/member");
  }, [router, toast]);

  async function handleEnableTrustedDevice() {
    if (!trustedPromptUser) return;

    setEnablingTrustedDevice(true);
    setError(null);

    try {
      await biometricAuthService.enableTrustedDevice(trustedPromptUser.id, trustedPromptUser.label);
      markTrustedSessionUnlocked(trustedPromptUser.id);
      toast({
        title: "Thumbprint diaktifkan",
        description: "Device ini kini boleh guna thumbprint untuk buka semula member area.",
      });
      await completeLoginRedirect();
    } catch (trustedError) {
      const message =
        trustedError instanceof Error
          ? trustedError.message
          : "Gagal aktifkan thumbprint pada device ini.";

      setError(message);
      toast({
        title: "Ralat Thumbprint",
        description: message,
        variant: "destructive",
      });
    } finally {
      setEnablingTrustedDevice(false);
    }
  }

  async function handleSkipTrustedDevice() {
    setTrustedPromptUser(null);
    await completeLoginRedirect();
  }

  async function handleSendTAC() {
    const normalizedPhone = combinePhone(countryCode, formData.phone);
    setError(null);

    if (!formData.phone.trim()) {
      toast({
        title: "Error",
        description: "Sila masukkan nombor telefon",
        variant: "destructive",
      });
      return;
    }

    const remaining = getCooldownRemaining();
    if (remaining > 0) {
      toast({
        title: "Sila Tunggu",
        description: `Sila tunggu ${remaining} saat sebelum memohon kod TAC baru`,
        variant: "destructive",
      });
      return;
    }

    if (!isValidPhone(normalizedPhone)) {
      toast({
        title: "Error",
        description: "Format nombor telefon tidak sah. Pastikan ia bermula dengan +60 atau +65.",
        variant: "destructive",
      });
      return;
    }

    setSendingTAC(true);

    try {
      const response = await fetch("/api/send-whatsapp-tac", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizedPhone }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send TAC");
      }

      setFormData((prev) => ({ ...prev, tac: "" }));
      setCooldownTimestamp();
      setLastTacPhone(normalizedPhone);
      setCooldownRemaining(COOLDOWN_DURATION);
      setTacSent(true);

      toast({
        title: "Kod TAC Dihantar",
        description: `Kod TAC telah dihantar ke WhatsApp ${normalizedPhone}.`,
      });
    } catch (sendError) {
      const message =
        sendError instanceof Error
          ? sendError.message
          : "Gagal menghantar kod TAC. Sila cuba lagi.";

      setError(message);
      toast({
        title: "Ralat",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSendingTAC(false);
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!tacSent) {
      toast({
        title: "Sila hantar kod TAC dahulu",
        variant: "destructive",
      });
      return;
    }

    if (!/^\d{6}$/.test(formData.tac)) {
      toast({
        title: "Kod TAC tidak sah",
        description: "Sila masukkan kod TAC 6 digit",
        variant: "destructive",
      });
      return;
    }

    const phoneToUse = formData.phone.trim()
      ? combinePhone(countryCode, formData.phone)
      : getLastTacPhone();

    if (!phoneToUse) {
      setTacSent(false);
      toast({
        title: "Ralat",
        description: "Nombor telefon tidak dijumpai. Sila hantar kod TAC semula.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), VERIFICATION_TIMEOUT);

      const response = await fetch("/api/verify-tac-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: phoneToUse,
          tac: formData.tac,
        }),
        signal: controller.signal,
      });

      window.clearTimeout(timeoutId);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Verifikasi gagal");
      }

      if (!data.success || !data.auth_token) {
        throw new Error("Kod TAC tidak sah");
      }

      const { data: authData, error: sessionError } = await supabase.auth.verifyOtp({
        token_hash: data.auth_token,
        type: "magiclink",
      });

      if (sessionError) {
        throw new Error(`Gagal menetapkan sesi: ${sessionError.message}`);
      }

      const currentUserId = authData.user?.id;
      const trustedLabel = authData.user?.phone ?? authData.user?.email ?? phoneToUse;

      if (currentUserId && biometricAuthService.isEnabledForUser(currentUserId)) {
        markTrustedSessionUnlocked(currentUserId);
        await completeLoginRedirect();
        return;
      }

      if (currentUserId && await biometricAuthService.isSupported()) {
        setTrustedPromptUser({
          id: currentUserId,
          label: trustedLabel,
        });
        setLoading(false);
        return;
      }

      await completeLoginRedirect();
    } catch (verifyError) {
      const message =
        verifyError instanceof Error && verifyError.name === "AbortError"
          ? "Verifikasi mengambil masa terlalu lama. Sila cuba lagi."
          : verifyError instanceof Error
            ? verifyError.message
            : "Ralat semasa mengesahkan kod TAC";

      setError(message);
      toast({
        title: "Ralat Verifikasi",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  if (trustedPromptUser) {
    return (
      <LoginShell error={error}>
        <div className="space-y-5 text-center">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Aktifkan Thumbprint</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Login TAC berjaya. Aktifkan thumbprint pada device ini supaya lain kali anda boleh buka semula member area tanpa minta TAC dahulu.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            Thumbprint hanya digunakan pada device semasa. Jika gagal atau device baharu digunakan, anda masih boleh login semula dengan WhatsApp TAC.
          </div>

          <div className="space-y-3">
            <Button
              type="button"
              onClick={handleEnableTrustedDevice}
              disabled={enablingTrustedDevice}
              className="h-11 w-full"
            >
              {enablingTrustedDevice ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mengaktifkan Thumbprint...
                </>
              ) : (
                "Aktifkan Thumbprint"
              )}
            </Button>
            <Button type="button" variant="outline" onClick={handleSkipTrustedDevice} className="h-11 w-full">
              Nanti Dulu
            </Button>
          </div>
        </div>
      </LoginShell>
    );
  }

  return (
    <LoginShell error={error}>
      <div className="mb-6 text-center">
        <h2 className="text-xl font-semibold text-foreground">Selamat Datang</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Login dengan WhatsApp TAC untuk akses ke Member Area
        </p>
      </div>

      <form onSubmit={handleLogin} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-sm font-medium">Nombor WhatsApp</Label>
          <div className="flex gap-2">
            <Select value={countryCode} onValueChange={setCountryCode} disabled={loading || sendingTAC || tacSent}>
              <SelectTrigger className="h-11 w-[110px] shrink-0">
                <SelectValue placeholder="Kod" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="+60">🇲🇾 +60</SelectItem>
                <SelectItem value="+65">🇸🇬 +65</SelectItem>
              </SelectContent>
            </Select>

            <Input
              id="phone"
              type="tel"
              placeholder="123456789"
              value={formData.phone}
              onChange={(event) => setFormData((prev) => ({ ...prev, phone: event.target.value }))}
              disabled={loading || sendingTAC || tacSent}
              required
              className="h-11 flex-1"
            />
          </div>
          <p className="text-xs text-muted-foreground">Pilih negara dan masukkan nombor contoh 123456789</p>
        </div>

        {!tacSent && (
          <Button
            type="button"
            onClick={handleSendTAC}
            disabled={sendingTAC || loading}
            className="h-11 w-full bg-green-600 hover:bg-green-700"
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
              <Label htmlFor="tac" className="text-sm font-medium">Kod TAC 6 digit</Label>
              <Input
                id="tac"
                type="text"
                inputMode="numeric"
                placeholder="Masukkan kod TAC dari WhatsApp"
                value={formData.tac}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    tac: event.target.value.replace(/\D/g, "").slice(0, 6),
                  }))
                }
                disabled={loading}
                maxLength={6}
                required
                className="h-11 text-center text-lg font-semibold tracking-widest"
              />
              <p className="text-center text-xs text-green-600">✓ Kod TAC telah dihantar ke WhatsApp anda</p>
            </div>

            <Button
              type="button"
              onClick={handleSendTAC}
              variant="ghost"
              className="w-full text-sm"
              disabled={loading || sendingTAC || cooldownRemaining > 0}
            >
              {cooldownRemaining > 0 ? `Tunggu ${cooldownRemaining}s untuk hantar semula` : "Hantar semula kod TAC"}
            </Button>

            <Button type="submit" disabled={loading || formData.tac.length !== 6} className="h-11 w-full bg-blue-600 hover:bg-blue-700">
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

      <div className="pt-4 text-center">
        <p className="text-xs text-muted-foreground">Masalah log masuk? Hubungi admin untuk bantuan.</p>
      </div>
    </LoginShell>
  );
}