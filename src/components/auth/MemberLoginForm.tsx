"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { authService } from "@/services/authService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Send, Shield, MessageCircle, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";

export function MemberLoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<"identifier" | "tac">("identifier");
  const [identifier, setIdentifier] = useState("");
  const [tacCode, setTacCode] = useState("");
  const [memberId, setMemberId] = useState("");
  const [memberData, setMemberData] = useState<{ phone: string; username: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(false);

  // Countdown timer for resend TAC
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && step === "tac") {
      setCanResend(true);
    }
  }, [countdown, step]);

  async function handleSendTAC() {
    if (!identifier.trim()) {
      setError("Sila masukkan username, email atau nombor telefon");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = await authService.sendWhatsAppTAC(identifier.trim());

      if (result.error) {
        setError(result.error.message);
        return;
      }

      if (result.data) {
        setMemberId(result.data.memberId);
        setMemberData({
          phone: result.data.phone,
          username: result.data.username,
        });
        setStep("tac");
        setCountdown(60);
        setCanResend(false);
        setSuccess(result.message || "Kod TAC telah dihantar ke WhatsApp anda!");
      }
    } catch (err: any) {
      console.error("Send TAC error:", err);
      setError(err.message || "Gagal menghantar kod TAC. Sila cuba lagi.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendTAC() {
    if (!canResend) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = await authService.sendWhatsAppTAC(identifier.trim());

      if (result.error) {
        setError(result.error.message);
        return;
      }

      setCountdown(60);
      setCanResend(false);
      setSuccess("Kod TAC telah dihantar semula ke WhatsApp!");
      setTacCode("");
    } catch (err: any) {
      console.error("Resend TAC error:", err);
      setError(err.message || "Gagal menghantar kod TAC. Sila cuba lagi.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyTAC() {
    if (!tacCode.trim()) {
      setError("Sila masukkan kod TAC");
      return;
    }

    if (tacCode.length !== 6) {
      setError("Kod TAC mesti 6 digit");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await authService.verifyWhatsAppTAC(memberId, tacCode.trim());

      if (result.error) {
        setError(result.error.message);
        return;
      }

      setSuccess(result.message || "✅ Login berjaya!");
      
      // Redirect after 1 second
      setTimeout(() => {
        router.push("/member");
      }, 1000);
    } catch (err: any) {
      console.error("Verify TAC error:", err);
      setError(err.message || "Kod TAC tidak sah. Sila cuba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <Shield className="h-12 w-12 text-red-600" />
        </div>
        <CardTitle className="text-2xl">Member Login</CardTitle>
        <CardDescription>
          {step === "identifier" && "Login menggunakan WhatsApp TAC"}
          {step === "tac" && "Masukkan kod TAC dari WhatsApp anda"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-500 bg-green-50 text-green-900">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {step === "identifier" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="identifier">Username / Email / Nombor Telefon</Label>
              <Input
                id="identifier"
                type="text"
                placeholder="Contoh: john123 atau 0123456789"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendTAC()}
                disabled={loading}
                autoFocus
              />
            </div>

            <Button
              onClick={handleSendTAC}
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menghantar...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Hantar Kod TAC
                </>
              )}
            </Button>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
              <MessageCircle className="h-4 w-4 inline mr-2" />
              Kod TAC akan dihantar ke <strong>WhatsApp</strong> nombor yang didaftarkan.
            </div>
          </>
        )}

        {step === "tac" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="tac">Kod TAC</Label>
              <Input
                id="tac"
                type="text"
                placeholder="Masukkan 6 digit kod"
                value={tacCode}
                onChange={(e) => setTacCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                onKeyDown={(e) => e.key === "Enter" && handleVerifyTAC()}
                disabled={loading}
                maxLength={6}
                className="text-center text-2xl tracking-widest"
                autoFocus
              />
              <p className="text-sm text-muted-foreground text-center">
                Kod TAC dihantar ke WhatsApp <strong>{memberData?.phone}</strong>
              </p>
            </div>

            <Button
              onClick={handleVerifyTAC}
              disabled={loading || tacCode.length !== 6}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify & Login"
              )}
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setStep("identifier");
                  setTacCode("");
                  setError("");
                  setSuccess("");
                  setCountdown(0);
                  setCanResend(false);
                }}
                disabled={loading}
                className="flex-1"
              >
                Kembali
              </Button>

              <Button
                variant="outline"
                onClick={handleResendTAC}
                disabled={loading || !canResend}
                className="flex-1"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : canResend ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Hantar Semula
                  </>
                ) : (
                  <>Tunggu {countdown}s</>
                )}
              </Button>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
              <strong>Tip:</strong> Check WhatsApp anda untuk kod TAC. Kod sah selama 5 minit.
            </div>
          </>
        )}

        <div className="text-center text-sm text-muted-foreground pt-4 border-t">
          <p>Admin? <Link href="/admin/login" className="text-red-600 hover:underline font-medium">Login di sini</Link></p>
        </div>
      </CardContent>
    </Card>
  );
}