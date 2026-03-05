"use client";

import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { memberService } from "@/services/memberService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Send, Shield } from "lucide-react";

export function MemberLoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<"identifier" | "otp">("identifier");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [memberId, setMemberId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSendOTP() {
    if (!identifier.trim()) {
      setError("Sila masukkan username, email atau nombor telefon");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Find member by username, email, or phone
      const member = await memberService.findMemberByIdentifier(identifier.trim());

      if (!member) {
        setError("Ahli tidak dijumpai. Sila hubungi admin.");
        return;
      }

      setMemberId(member.id);

      // Determine if we should use phone or email for OTP
      if (member.phone) {
        // Use phone OTP
        setPhone(member.phone);
        
        const { error: otpError } = await supabase.auth.signInWithOtp({
          phone: member.phone,
          options: {
            channel: "whatsapp" // Use WhatsApp for OTP
          }
        });

        if (otpError) throw otpError;

        setStep("otp");
        setError("");
      } else if (member.email) {
        // Use email OTP as fallback
        setEmail(member.email);
        
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: member.email,
          options: {
            shouldCreateUser: true
          }
        });

        if (otpError) throw otpError;

        setStep("otp");
        setError("");
      } else {
        setError("Ahli tidak mempunyai telefon atau email. Sila hubungi admin untuk update maklumat.");
      }
    } catch (err: any) {
      console.error("Send OTP error:", err);
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

    setLoading(true);
    setError("");

    try {
      let authResult;

      if (phone) {
        // Verify phone OTP
        authResult = await supabase.auth.verifyOtp({
          phone,
          token: otp.trim(),
          type: "sms"
        });
      } else if (email) {
        // Verify email OTP
        authResult = await supabase.auth.verifyOtp({
          email,
          token: otp.trim(),
          type: "email"
        });
      }

      if (authResult?.error) throw authResult.error;

      if (!authResult?.data.user) {
        throw new Error("Gagal verify OTP");
      }

      // Link member to auth user if not already linked
      await memberService.updateMember(memberId, {
        user_id: authResult.data.user.id,
        is_verified: true
      });

      // Redirect to member dashboard
      router.push("/member");
    } catch (err: any) {
      console.error("Verify OTP error:", err);
      setError(err.message || "Kod OTP tidak sah. Sila cuba lagi.");
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
          {step === "identifier" 
            ? "Masukkan username, email atau nombor telefon" 
            : "Masukkan kod OTP yang dihantar"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === "identifier" ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="identifier">Username / Email / Telefon</Label>
              <Input
                id="identifier"
                type="text"
                placeholder="Contoh: john123 atau +60123456789"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendOTP()}
                disabled={loading}
              />
            </div>

            <Button
              onClick={handleSendOTP}
              disabled={loading}
              className="w-full"
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
          </>
        ) : (
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
              />
              <p className="text-sm text-muted-foreground text-center">
                Kod OTP dihantar ke {phone ? "WhatsApp" : "email"} anda
              </p>
            </div>

            <Button
              onClick={handleVerifyOTP}
              disabled={loading}
              className="w-full"
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

            <Button
              variant="outline"
              onClick={() => {
                setStep("identifier");
                setOtp("");
                setError("");
              }}
              disabled={loading}
              className="w-full"
            >
              Kembali
            </Button>
          </>
        )}

        <div className="text-center text-sm text-muted-foreground">
          <p>Admin? <Link href="/admin/login" className="text-red-600 hover:underline">Login di sini</Link></p>
        </div>
      </CardContent>
    </Card>
  );
}