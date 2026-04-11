import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { WhatsAppLoginForm } from "@/components/auth/WhatsAppLoginForm";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

function AuthLoadingScreen({ message }: { message: string }) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
            <div className="text-center" aria-live="polite" aria-busy="true">
                <div
                    className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"
                    aria-hidden="true"
                />
                <p className="mt-4 text-muted-foreground">{message}</p>
            </div>
        </div>
    );
}

export default function LoginPage() {
    const router = useRouter();
    const { isAuthenticated, loading } = useAuth(false, false, { subscribe: false });
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted || loading || !isAuthenticated) return;

        const redirect = async () => {
            try {
                await router.replace("/member");
            } catch (error) {
                if (process.env.NODE_ENV !== "production") {
                    console.error("Login redirect failed:", error);
                }
            }
        };

        void redirect();
    }, [mounted, loading, isAuthenticated, router]);

    if (!mounted) {
        return (
            <>
                <SEO
                    title="Login - AMBC Club"
                    description="Login ke AMBC Club member area"
                />
                <AuthLoadingScreen message="Loading..." />
            </>
        );
    }

    if (loading) {
        return (
            <>
                <SEO
                    title="Login - AMBC Club"
                    description="Login ke AMBC Club member area"
                />
                <AuthLoadingScreen message="Checking session..." />
            </>
        );
    }

    if (isAuthenticated) {
        return (
            <>
                <SEO
                    title="Login - AMBC Club"
                    description="Login ke AMBC Club member area"
                />
                <AuthLoadingScreen message="Redirecting..." />
            </>
        );
    }

    return (
        <>
            <SEO
                title="Login - AMBC Club"
                description="Login ke AMBC Club member area"
            />
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
                <div className="container mx-auto px-4 py-8">
                    <Button
                        variant="ghost"
                        onClick={() => router.push("/")}
                        className="mb-4"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Kembali
                    </Button>
                </div>
                <WhatsAppLoginForm />
            </div>
        </>
    );
}