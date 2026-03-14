import { useRouter } from "next/router";
import Image from "next/image";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SEO } from "@/components/SEO";
import { ClubLogo } from "@/components/ClubLogo";
import {
  Trophy,
  Target,
  Users,
  BarChart3,
  User,
  LayoutGrid,
  Shuffle,
  Image as ImageIcon,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { PageAccessGuard } from "@/components/PageAccessGuard";
import { PwaInstallCard } from "@/components/pwa/PwaInstallCard";
import { NotificationInbox } from "@/components/notifications/NotificationInbox";
import { MemberLayout } from "@/components/member/MemberLayout";

const cardVariants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: index * 0.1,
      duration: 0.5,
      type: "spring",
      stiffness: 100,
    },
  }),
};

const navigationCards = [
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
    title: "Hall of Fame",
    description: "Top Performers",
    href: "/member/hall-of-fame",
    icon: Trophy,
    iconColor: "text-amber-600",
    hoverBorder: "hover:border-amber-600",
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
    title: "Lane",
    description: "Kedudukan Lane",
    href: "/member/lane",
    icon: LayoutGrid,
    iconColor: "text-orange-500",
    hoverBorder: "hover:border-orange-500",
  },
  {
    title: "Gallery",
    description: "Photo Albums",
    href: "/member/gallery",
    icon: ImageIcon,
    iconColor: "text-pink-600",
    hoverBorder: "hover:border-pink-600",
  },
  {
    title: "Mini Blok",
    description: "Mini Competition",
    href: "/member/mini-blok",
    icon: Trophy,
    iconColor: "text-indigo-600",
    hoverBorder: "hover:border-indigo-600",
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
    title: "Feedback",
    description: "Hantar cadangan / aduan",
    href: "/member/feedback",
    icon: Users,
    iconColor: "text-sky-600",
    hoverBorder: "hover:border-sky-600",
  },
];

export default function MemberDashboard() {
  const router = useRouter();
  const { member, loading } = useAuth(false);

  if (loading) {
    return null;
  }

  return (
    <PageAccessGuard pagePath="/member" requireAuth={false}>
      <SEO title="Member Dashboard - AMBC Club" description="Dashboard ahli AMBC Club" />

      <MemberLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            <PwaInstallCard />
            <NotificationInbox />
          </div>

          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Card className="mb-8 bg-theme-welcome text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold mb-2">
                      {member
                        ? `Selamat Datang, ${member.full_name || member.username}! 🎳`
                        : "Selamat Datang ke AMBC Club! 🎳"}
                    </h2>

                    {member ? (
                      <p className="text-red-100">@{member.username}</p>
                    ) : (
                      <p className="text-red-100">Sila login untuk akses penuh</p>
                    )}
                  </div>

                  <ClubLogo size="xl" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {navigationCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={card.href}
                  custom={index}
                  initial="hidden"
                  animate="visible"
                  variants={cardVariants}
                >
                  <Link href={card.href} className="block transition-transform hover:scale-105">
                    <Card className={`h-full cursor-pointer hover:shadow-lg border-2 ${card.hoverBorder}`}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div>
                          <CardTitle className="text-lg font-semibold">{card.title}</CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
                        </div>
                        <Icon className={`h-6 w-6 ${card.iconColor}`} />
                      </CardHeader>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}

            {member && (
              <motion.div
                custom={navigationCards.length}
                initial="hidden"
                animate="visible"
                variants={cardVariants}
              >
                <Link href="/member/profile" className="block transition-transform hover:scale-105">
                  <Card className="h-full cursor-pointer hover:shadow-lg border-2 hover:border-red-600">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <div>
                        <CardTitle className="text-lg font-semibold">Profile</CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          Edit profile & rekod game
                        </p>
                      </div>
                      <User className="h-6 w-6 text-red-600" />
                    </CardHeader>
                  </Card>
                </Link>
              </motion.div>
            )}
          </div>
        </div>
      </MemberLayout>
    </PageAccessGuard>
  );
}