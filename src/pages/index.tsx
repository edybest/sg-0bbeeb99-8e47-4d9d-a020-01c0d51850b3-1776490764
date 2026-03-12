import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import {
    BarChart3,
    LayoutGrid,
    Loader2,
    LogOut,
    Shuffle,
    Target,
    Trophy,
    User,
    Users,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import { ClubLogo } from "@/components/ClubLogo";
import { MobileNav } from "@/components/member/MobileNav";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { PwaInstallCard } from "@/components/pwa/PwaInstallCard";

import type { Session } from "@supabase/supabase-js";
import type { LucideIcon } from "lucide-react";

type Member = {
    id: string;
    user_id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
};

type NavigationCard = {
    title: string;
    description: string;
    href: string;
    icon: LucideIcon;
    iconColor: string;
    hoverBorder: string;
    requiresAuth?: boolean;
};

type AuthState = "loading" | "authenticated" | "guest";

const cardVariants = {
    hidden: {
        opacity: 0,
        y: 20,
    },
    visible: (index: number) => ({
        opacity: 1,
        y: 0,
        transition: {
            delay: index * 0.08,
            duration: 0.45,
            type: "spring",
            stiffness: 110,
        },
    }),
};

const navigationCards: NavigationCard[] = [
    {
        title: "Blok",
        description: "Leaderboard & Rankings",
        href: "/member/blok",
        icon: Trophy,
        iconColor: "text-yellow-600",
        hoverBorder: "hover:border-yellow-600",
    },
    {
        title: "FiveFive",
        description: "Prize Distribution",
        href: "/member/five-five",
        icon: Target,
        iconColor: "text-blue-600",
        hoverBorder: "hover:border-blue-600",
    },
    {
        title: "Training",
        description: "Practice Scores",
        href: "/member/training",
        icon: Target,
        iconColor: "text-green-600",
        hoverBorder: "hover:border-green-600",
    },
    {
        title: "Hall of Fame",
        description: "Top Performers",
        href: "/member/hall-of-fame",
        icon: Trophy,
        iconColor: "text-amber-600",
        hoverBorder: "hover:border-amber-600",
    },
    {
        title: "Lane",
        description: "Kedudukan Lane",
        href: "/member/lane",
        icon: LayoutGrid,
        iconColor: "text-orange-500",
        hoverBorder: "hover:border-orange-500",
    },
    {
        title: "Undi Lane",
        description: "Undian Lane Bertuah",
        href: "/member/undi-lane",
        icon: Shuffle,
        iconColor: "text-purple-600",
        hoverBorder: "hover:border-purple-600",
    },
    {
        title: "Average Score",
        description: "Purata 3 game terkini",
        href: "/member/average-score",
        icon: BarChart3,
        iconColor: "text-red-600",
        hoverBorder: "hover:border-red-600",
    },
    {
        title: "Profile",
        description: "Edit profile & rekod game",
        href: "/member/profile",
        icon: User,
        iconColor: "text-red-600",
        hoverBorder: "hover:border-red-600",
        requiresAuth: true,
    },
];

const comingSoonCards = [
    {
        title: "Liga",
        description: "Coming Soon",
        icon: Trophy,
    },
    {
        title: "Couple",
        description: "Coming Soon",
        icon: Users,
    },
] satisfies Array<{
    title: string;
    description: string;
    icon: LucideIcon;
}>;

function getInitials(name?: string | null, username?: string | null) {
    const source = name?.trim() || username?.trim() || "User";
    return source.charAt(0).toUpperCase();
}

async function fetchMember(userId: string): Promise<Member | null> {
    const { data, error } = await supabase
        .from("members")
        .select("id, user_id, username, full_name, avatar_url")
        .eq("user_id", userId)
        .maybeSingle();

    if (error) {
        throw error;
    }

    return data;
}

function DashboardCard({
    title,
    description,
    href,
    icon: Icon,
    iconColor,
    hoverBorder,
    index,
}: NavigationCard & { index: number }) {
    return (
        <motion.div
            custom={index}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
        >
            <Link href={href} className="block transition-transform hover:scale-[1.02]">
                <Card className={`h-full cursor-pointer border-2 transition-all hover:shadow-lg ${hoverBorder}`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div>
                            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
                            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
                        </div>
                        <Icon className={`h-6 w-6 ${iconColor}`} />
                    </CardHeader>
                </Card>
            </Link>
        </motion.div>
    );
}

export default function HomePage() {
    const router = useRouter();
    useAuth(false, false, { subscribe: false });

    const [authState, setAuthState] = useState<AuthState>("loading");
    const [member, setMember] = useState<Member | null>(null);
    const [isSigningOut, setIsSigningOut] = useState(false);

    const loadSession = useCallback(async (session: Session | null) => {
        if (!session) {
            setMember(null);
            setAuthState("guest");
            return;
        }

        setAuthState("loading");

        try {
            const memberData = await fetchMember(session.user.id);
            setMember(memberData);
            setAuthState("authenticated");
        } catch (error) {
            console.error("Failed to fetch member profile:", error);
            setMember(null);
            setAuthState("authenticated");
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        async function initialize() {
            try {
                const {
                    data: { session },
                    error,
                } = await supabase.auth.getSession();

                if (error) {
                    throw error;
                }

                if (!isMounted) {
                    return;
                }

                await loadSession(session);
            } catch (error) {
                console.error("Failed to initialize auth state:", error);
                if (isMounted) {
                    setMember(null);
                    setAuthState("guest");
                }
            }
        }

        initialize();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            void loadSession(session);
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, [loadSession]);

    const visibleNavigationCards = useMemo(() => {
        const isAuthenticated = authState === "authenticated";
        return navigationCards.filter((card) => !card.requiresAuth || isAuthenticated);
    }, [authState]);

    const isAuthenticated = authState === "authenticated";
    const displayName = member?.full_name?.trim() || member?.username?.trim() || "Ahli AMBC";

    async function handleLogout() {
        try {
            setIsSigningOut(true);
            const { error } = await supabase.auth.signOut();

            if (error) {
                throw error;
            }

            setMember(null);
            setAuthState("guest");
            await router.push("/login");
        } catch (error) {
            console.error("Logout failed:", error);
        } finally {
            setIsSigningOut(false);
        }
    }

    if (authState === "loading") {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-red-600" />
            </div>
        );
    }

    return (
        <>
            <SEO
                title="AMBC Club - Bowling Club Management"
                description="Welcome to AMBC Club"
            />

            <div className="min-h-screen bg-gray-50">
                <header className="border-b border-gray-200 bg-white shadow-sm">
                    <div className="container mx-auto px-4 py-4">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <MobileNav />
                                <ClubLogo size="sm" />
                                <div>
                                    <h1 className="text-2xl font-bold text-red-600">AMBC CLUB</h1>
                                    <p className="text-sm text-gray-600">Bowling Club Management</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {isAuthenticated && member ? (
                                    <>
                                        {member.avatar_url ? (
                                            <Image
                                                src={member.avatar_url}
                                                alt={member.username ?? "Member avatar"}
                                                width={40}
                                                height={40}
                                                className="rounded-full border-2 border-red-600 object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 font-bold text-white">
                                                {getInitials(member.full_name, member.username)}
                                            </div>
                                        )}

                                        <Button
                                            variant="outline"
                                            onClick={handleLogout}
                                            disabled={isSigningOut}
                                            className="border-gray-300 hover:bg-gray-100"
                                        >
                                            {isSigningOut ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <LogOut className="mr-2 h-4 w-4" />
                                            )}
                                            <span className="hidden sm:inline">Logout</span>
                                        </Button>
                                    </>
                                ) : (
                                    <Button
                                        variant="outline"
                                        onClick={() => void router.push("/login")}
                                        className="border-red-600 text-red-600 hover:bg-red-50"
                                    >
                                        <User className="mr-2 h-4 w-4" />
                                        <span className="hidden sm:inline">Login</span>
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                <main className="container mx-auto px-4 py-8">
                    <div className="mb-6">
                        <PwaInstallCard />
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <Card className="mb-8 bg-gradient-to-r from-red-600 to-red-700 text-white">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-4">
                                    <div className="flex-1">
                                        <h2 className="mb-2 text-2xl font-bold">
                                            {isAuthenticated
                                                ? `Selamat Datang, ${displayName}! 🎳`
                                                : "Selamat Datang ke AMBC Club! 🎳"}
                                        </h2>

                                        {isAuthenticated && member?.username ? (
                                            <p className="text-red-100">@{member.username}</p>
                                        ) : (
                                            <p className="text-red-100">Explore our bowling club features</p>
                                        )}
                                    </div>

                                    <ClubLogo size="xl" />
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <section aria-label="Navigation menu">
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {visibleNavigationCards.map((card, index) => (
                                <DashboardCard key={card.href} {...card} index={index} />
                            ))}
                        </div>
                    </section>

                    <motion.section
                        className="mt-8"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8, duration: 0.6 }}
                        aria-label="Coming soon features"
                    >
                        <h3 className="mb-4 text-lg font-semibold text-gray-700">Coming Soon</h3>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            {comingSoonCards.map((item, index) => {
                                const Icon = item.icon;

                                return (
                                    <motion.div
                                        key={item.title}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 0.6, scale: 1 }}
                                        transition={{ delay: 1 + index * 0.1, duration: 0.35 }}
                                    >
                                        <Card className="opacity-60">
                                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                <div>
                                                    <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
                                                    <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                                                </div>
                                                <Icon className="h-4 w-4 text-muted-foreground" />
                                            </CardHeader>
                                        </Card>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </motion.section>
                </main>
            </div>
        </>
    );
}
