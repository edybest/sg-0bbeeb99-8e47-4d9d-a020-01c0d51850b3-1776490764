import { useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { WhatsAppLoginForm } from "@/components/auth/WhatsAppLoginForm";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";

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
    const { isAuthenticated, loading } = useAuth();

    const shouldRedirect = useMemo(
        () => !loading && isAuthenticated,
        [loading, isAuthenticated]
    );

    useEffect(() => {
        let isMounted = true;

        if (!shouldRedirect) return;

        const redirect = async () => {
            try {
                await router.replace("/member");
            } catch (error) {
                if (process.env.NODE_ENV !== "production") {
                    console.error("Login redirect failed:", error);
                }
            }
        };

        if (isMounted) {
            void redirect();
        }

        return () => {
            isMounted = false;
        };
    }, [shouldRedirect, router]);

    return (
        <>
            <SEO
                title="Login - AMBC Club"
                description="Login ke AMBC Club member area"
            />

            {loading ? (
                <AuthLoadingScreen message="Checking session..." />
            ) : shouldRedirect ? (
                <AuthLoadingScreen message="Redirecting..." />
            ) : (
                <WhatsAppLoginForm />
            )}
        </>
    );
}