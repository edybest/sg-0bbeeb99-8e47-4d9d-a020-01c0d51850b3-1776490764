import { useState } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MessageCircle } from "lucide-react";

export function WhatsAppLoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sendingTAC, setSendingTAC] = useState(false);
  const [tacSent, setTacSent] = useState(false);
  const [serverTacCode, setServerTacCode] = useState(""); // Store TAC from server
  const [formData, setFormData] = useState({
    username: "",
    phone: "",
    tac: "",
  });

  async function handleSendTAC() {
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

      // Store TAC code from server response
      if (data.data?.code) {
        setServerTacCode(data.data.code);
      }

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
        title: "Error",
        description: "Sila hantar kod TAC terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    if (!formData.tac) {
      toast({
        title: "Error",
        description: "Sila masukkan kod TAC",
        variant: "destructive",
      });
      return;
    }

    // Verify TAC code matches
    if (formData.tac !== serverTacCode) {
      toast({
        title: "Error",
        description: "Kod TAC tidak sah. Sila cuba lagi.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/whatsapp-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "verify",
          username: formData.username,
          phone: formData.phone,
          tac: formData.tac,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      toast({
        title: "Berjaya",
        description: "Login berjaya! Redirecting...",
      });

      // Small delay before redirect
      setTimeout(() => {
        router.push("/member");
      }, 1000);
    } catch (error: unknown) {
      console.error("Login error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Login gagal. Sila cuba lagi.",
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
                disabled={loading}
              >
                Hantar semula kod TAC
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