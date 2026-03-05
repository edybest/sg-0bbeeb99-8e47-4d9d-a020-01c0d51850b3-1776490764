"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { authService } from "@/services/authService";
import { memberService } from "@/services/memberService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Send, Shield, Mail, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";

export function MemberLoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<"identifier" | "otp" | "bypass">("identifier");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [memberId, setMemberId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);

  // Countdown timer for resend OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && step === "otp") {
      setCanResend(true);
    }
  }, [countdown, step]);

  async function handleSendOTP() {
    if (!identifier.trim()) {
      setError("Sila masukkan username atau email");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");
    setIsRateLimited(false);

    try {
      // Find member by username or email
      const member = await memberService.findMemberByIdentifier(identifier.trim());

      if (!member) {
        setError("Ahli tidak dijumpai. Sila hubungi admin.");
        return;
      }

      if (!member.email) {
        setError("Ahli tidak mempunyai email. Sila hubungi admin untuk update email.");
        return;
      }

      setMemberId(member.id);
      setEmail(member.email);

      // Send email OTP
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: member.email,
        options: {
          shouldCreateUser: true,
        }
      });

      if (otpError) {
        // Check if it's a rate limit error
        if (otpError.message?.includes("rate limit") || otpError.message?.includes("Email rate limit exceeded")) {
          setIsRateLimited(true);
          setError("⚠️ Email Rate Limit Exceeded");
          setStep("bypass");
          return;
        }
        throw otpError;
      }

      setStep("otp");
      setCountdown(60);
      setCanResend(false);
      setSuccess("Kod OTP telah dihantar ke email anda!");
    } catch (err: any) {
      console.error("Send OTP error:", err);
      setError(err.message || "Gagal menghantar OTP. Sila cuba lagi.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOTP() {
    if (!canResend) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        }
      });

      if (otpError) {
        if (otpError.message?.includes("rate limit") || otpError.message?.includes("Email rate limit exceeded")) {
          setIsRateLimited(true);
          setError("⚠️ Email Rate Limit Exceeded");
          setStep("bypass");
          return;
        }
        throw otpError;
      }

      setCountdown(60);
      setCanResend(false);
      setSuccess("Kod OTP telah dihantar semula!");
      setOtp("");
    } catch (err: any) {
      console.error("Resend OTP error:", err);
      setError(err.message || "Gagal menghantar OTP. Sila cuba lagi.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOTP() {
    if (!otp.trim()) {
      setError("Sila masukkan kod OTP");
      return;
    }

    if (otp.length !== 6) {
      setError("Kod OTP mesti 6 digit");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const authResult = await supabase.auth.verifyOtp({
        email,
        token: otp.trim(),
        type: "email"
      });

      if (authResult?.error) throw authResult.error;

      if (!authResult?.data.user) {
        throw new Error("Gagal verify OTP");
      }

      await memberService.updateMember(memberId, {
        user_id: authResult.data.user.id,
        is_verified: true
      });

      router.push("/member");
    } catch (err: any) {
      console.error("Verify OTP error:", err);
      setError(err.message || "Kod OTP tidak sah. Sila cuba lagi.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDevBypass() {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = await authService.devBypassLogin(identifier);

      if (result.error) {
        setError(result.error.message || "Gagal bypass login");
        return;
      }

      if (result.data?.member) {
        setSuccess(result.message || "✅ Member verified! Redirecting...");
        
        // Wait 2 seconds then redirect
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
      }
    } catch (err: any) {
      console.error("Dev bypass error:", err);
      setError(err.message || "Gagal bypass login");
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
          {step === "identifier" && "Masukkan username atau email anda"}
          {step === "otp" && "Masukkan kod OTP yang dihantar ke email anda"}
          {step === "bypass" && "⚠️ Rate Limit - Development Bypass"}
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
              <Label htmlFor="identifier">Username / Email</Label>
              <Input
                id="identifier"
                type="text"
                placeholder="Contoh: john123 atau john@example.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendOTP()}
                disabled={loading}
                autoFocus
              />
            </div>

            <Button
              onClick={handleSendOTP}
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
                  Hantar Kod OTP
                </>
              )}
            </Button>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
              <Mail className="h-4 w-4 inline mr-2" />
              Kod OTP akan dihantar ke <strong>email</strong> yang didaftarkan.
            </div>
          </>
        )}

        {step === "otp" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="otp">Kod OTP</Label>
              <Input
                id="otp"
                type="text"
                placeholder="Masukkan 6 digit kod"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                onKeyDown={(e) => e.key === "Enter" && handleVerifyOTP()}
                disabled={loading}
                maxLength={6}
                className="text-center text-2xl tracking-widest"
                autoFocus
              />
              <p className="text-sm text-muted-foreground text-center">
                Kod OTP dihantar ke <strong>{email}</strong>
              </p>
            </div>

            <Button
              onClick={handleVerifyOTP}
              disabled={loading || otp.length !== 6}
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
                  setOtp("");
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
                onClick={handleResendOTP}
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
              <strong>Tip:</strong> Check spam/junk folder kalau tidak jumpa email. Kod valid selama 60 minit.
            </div>
          </>
        )}

        {step === "bypass" && (
          <>
            <div className="bg-orange-50 border-2 border-orange-500 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-2 text-sm">
                  <p className="font-semibold text-orange-900">Email Rate Limit Exceeded</p>
                  <p className="text-orange-800">
                    Supabase FREE tier limits: <strong>4 emails per hour</strong> per address.
                  </p>
                  <p className="text-orange-800">
                    Anda telah melebihi had ini untuk <strong>{email}</strong>
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-4 space-y-3">
              <p className="font-semibold text-blue-900 text-sm">🛠️ Development Bypass Options:</p>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Auto-verify member tanpa OTP</li>
                <li>Skip email verification untuk testing</li>
                <li>Hubungi admin untuk manual approval</li>
              </ul>
            </div>

            <Button
              onClick={handleDevBypass}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Auto-Verify & Continue
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                setStep("identifier");
                setError("");
                setSuccess("");
                setIsRateLimited(false);
              }}
              disabled={loading}
              className="w-full"
            >
              Kembali
            </Button>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
              <strong>Alternative:</strong> Tunggu 1 jam atau cuba dengan email lain untuk normal OTP login.
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