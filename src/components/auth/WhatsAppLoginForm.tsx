import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { pageAccessService } from "@/services/pageAccessService";
import { Loader2, MessageCircle } from "lucide-react";
import Image from "next/image";

const TAC_COOLDOWN_KEY = "tac_cooldown_timestamp";
const COOLDOWN_DURATION = 90;
const TAC_PHONE_KEY = "tac_phone_last";

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

function setLastTacPhone(phone: string) {
    if (typeof window === "undefined") return;
    localStorage.setItem(TAC_PHONE_KEY, phone);
}

function getLastTacPhone(): string {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(TAC_PHONE_KEY) || "";
}

function clearLastTacPhone() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(TAC_PHONE_KEY);
}

export function WhatsAppLoginForm() {
    const router = useRouter();
    const { toast } = useToast();

    const [loading, setLoading] = useState(false);
    const [sendingTAC, setSendingTAC] = useState(false);
    const [tacSent, setTacSent] = useState(false);
    const [cooldownRemaining, setCooldownRemaining] = useState(0);

    const [countryCode, setCountryCode] = useState("+60");
    const [formData, setFormData] = useState({
        phone: "",
        tac: ""
    });

    useEffect(() => {
        const remaining = getCooldownRemaining();
        setCooldownRemaining(remaining);

        if (remaining > 0) {
            setTacSent(true);

            const lastPhone = getLastTacPhone();
            if (lastPhone) {
                if (lastPhone.startsWith("+65")) {
                    setCountryCode("+65");
                    setFormData((prev) => ({ ...prev, phone: lastPhone.substring(3) }));
                } else if (lastPhone.startsWith("+60")) {
                    setCountryCode("+60");
                    setFormData((prev) => ({ ...prev, phone: lastPhone.substring(3) }));
                } else {
                    setFormData((prev) => ({ ...prev, phone: lastPhone }));
                }
            }
        }
    }, []);

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
        const normalizedPhone = combinePhone(countryCode, formData.phone);

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

        if (!isValidPhone(normalizedPhone)) {
            toast({
                title: "Error",
                description: "Format nombor telefon tidak sah. Pastikan ia bermula dengan +60 (Malaysia) atau +65 (Singapura).",
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

            // Only reset TAC field, leave phone as user typed
            setFormData((prev) => ({ ...prev, tac: "" }));

            setCooldownTimestamp();
            setLastTacPhone(normalizedPhone);
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

        if (!/^\d{6}$/.test(formData.tac)) {
            toast({
                title: "Kod TAC tidak sah",
                description: "Sila masukkan kod TAC 6 digit",
                variant: "destructive"
            });
            return;
        }

        const phoneToUse = formData.phone?.trim()
            ? combinePhone(countryCode, formData.phone)
            : getLastTacPhone();

        if (!phoneToUse || !phoneToUse.trim()) {
            toast({
                title: "Ralat",
                description: "Nombor telefon tidak dijumpai. Sila hantar kod TAC semula.",
                variant: "destructive"
            });
            setTacSent(false);
            return;
        }

        setLoading(true);

        // Show error if takes > 25 seconds
        const loadingTimeout = setTimeout(() => {
            setLoading(false);
            toast({
                title: "Ralat: Mengambil masa terlalu lama",
                description: "Sila cuba lagi. Jika masalah berterusan, hubungi admin.",
                variant: "destructive"
            });
        }, 25000);

        try {
            console.log("🔐 Submitting login with:", {
                phone: phoneToUse,
                code: formData.tac,
                phoneLength: phoneToUse.length,
                codeLength: formData.tac.length
            });

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000);

            let response: Response;
            try {
                response = await fetch("/api/verify-tac-login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        phone: phoneToUse,
                        code: formData.tac
                    }),
                    signal: controller.signal
                });
            } catch (fetchError) {
                clearTimeout(timeoutId);

                if (fetchError instanceof Error && fetchError.name === "AbortError") {
                    // Request timed out on client side, but server may have succeeded
                    // Check if session already exists before showing error
                    const { data: existingSession } = await supabase.auth.getSession();
                    if (existingSession.session) {
                        clearTimeout(loadingTimeout);
                        clearCooldownTimestamp();
                        clearLastTacPhone();
                        pageAccessService.clearCache();
                        toast({
                            title: "Log masuk berjaya!",
                            description: "Mengalihkan ke dashboard..."
                        });
                        await router.push("/member");
                        return;
                    }
                    throw new Error("Permintaan tamat masa. Sila cuba lagi.");
                }
                throw fetchError;
            }

            clearTimeout(timeoutId);

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

                let sessionOk = false;
                const maxRetries = 8;
                const retryDelay = 200;

                for (let i = 0; i < maxRetries; i++) {
                    const { data: sessionData, error: sessionReadError } = await supabase.auth.getSession();
                    if (!sessionReadError && sessionData.session) {
                        sessionOk = true;
                        console.log(`✅ Session verified on attempt ${i + 1}`);
                        break;
                    }

                    if (i < maxRetries - 1) {
                        await new Promise((resolve) => setTimeout(resolve, retryDelay));
                    }
                }

                if (!sessionOk) {
                    const { data: refreshData } = await supabase.auth.refreshSession();
                    if (refreshData.session) {
                        sessionOk = true;
                        console.log("✅ Session verified after refresh");
                    }
                }

                if (!sessionOk) {
                    throw new Error("Sesi log masuk belum sedia. Sila cuba lagi.");
                }
            } else {
                throw new Error("Token sesi tidak diterima dari server.");
            }

            clearTimeout(loadingTimeout);
            clearCooldownTimestamp();
            clearLastTacPhone();
            pageAccessService.clearCache();

            toast({
                title: "Log masuk berjaya!",
                description: "Mengalihkan ke dashboard..."
            });

            await router.push("/member");
        } catch (error: unknown) {
            console.error("Login error:", error);

            clearTimeout(loadingTimeout);

            const errorMessage =
                error instanceof Error
                    ? error.message
                    : "Kod TAC tidak sah atau telah tamat tempoh";

            toast({
                title: "Ralat semasa log masuk",
                description: errorMessage,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-background to-purple-50 dark:from-blue-950/20 dark:via-background dark:to-purple-950/20 px-4 py-8">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 mx-auto mb-6 transform hover:scale-105 transition-transform duration-300">
                        <Image
                            src="/ambc-logo.png"
                            alt="AMBC Logo"
                            fill
                            className="object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                        />
                    </div>
                </div>

                <div className="bg-card rounded-2xl shadow-xl p-8 space-y-6">
                    <div className="text-center mb-6">
                        <h2 className="text-xl font-semibold text-foreground">Selamat Datang</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Login dengan WhatsApp TAC untuk akses ke Member Area
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="phone" className="text-sm font-medium">
                                Nombor WhatsApp
                            </Label>
                            <div className="flex gap-2">
                                <Select
                                    value={countryCode}
                                    onValueChange={setCountryCode}
                                    disabled={loading || sendingTAC || tacSent}
                                >
                                    <SelectTrigger className="w-[110px] h-11 shrink-0">
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
                                    onChange={(e) =>
                                        setFormData((prev) => ({ ...prev, phone: e.target.value }))
                                    }
                                    disabled={loading || sendingTAC || tacSent}
                                    required
                                    className="h-11 flex-1"
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Pilih negara dan masukkan nombor (cth: 123456789)
                            </p>
                        </div>

                        {!tacSent && (
                            <Button
                                type="button"
                                onClick={handleSendTAC}
                                disabled={sendingTAC || loading}
                                className="w-full h-11 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
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
                                    <Label htmlFor="tac" className="text-sm font-medium">
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
                                        onFocus={(e) => e.target.select()}
                                        disabled={loading}
                                        maxLength={6}
                                        required
                                        className="h-11 text-center text-lg font-semibold tracking-widest"
                                    />
                                    <p className="text-xs text-green-600 dark:text-green-500 flex items-center justify-center">
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
                                    className="w-full h-11 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
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

                    <div className="text-center pt-4 border-t border-border">
                        <p className="text-xs text-muted-foreground">
                            Masalah log masuk? Hubungi admin untuk bantuan, TQ.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}