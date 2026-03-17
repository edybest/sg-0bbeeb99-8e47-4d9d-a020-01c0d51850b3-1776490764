import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Trophy, 
  Target, 
  Users, 
  TrendingUp, 
  Calendar,
  Award,
  Camera,
  MessageSquare,
  Sparkles,
  Star,
  Crown,
  Heart
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { MemberLayout } from "@/components/member/MemberLayout";
import { BowlingBallLoaderOverlay } from "@/components/BowlingBallLoader";
import type { Database } from "@/integrations/supabase/types";

type Member = Database["public"]["Tables"]["members"]["Row"];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 12
    }
  }
};

const features = [
  {
    title: "Training",
    description: "Record your practice scores",
    icon: Target,
    href: "/member/training",
    gradient: "from-pink-500 to-rose-500",
    iconColor: "text-pink-600"
  },
  {
    title: "Games",
    description: "View all bowling games",
    icon: Trophy,
    href: "/member/blok",
    gradient: "from-purple-500 to-pink-500",
    iconColor: "text-purple-600"
  },
  {
    title: "Lane Draw",
    description: "Random lane assignment",
    icon: Sparkles,
    href: "/member/undi-lane",
    gradient: "from-violet-500 to-purple-500",
    iconColor: "text-violet-600"
  },
  {
    title: "Hall of Fame",
    description: "Top performers & achievements",
    icon: Crown,
    href: "/member/hall-of-fame",
    gradient: "from-amber-500 to-orange-500",
    iconColor: "text-amber-600"
  },
  {
    title: "Gallery",
    description: "Photos & memories",
    icon: Camera,
    href: "/member/gallery",
    gradient: "from-blue-500 to-cyan-500",
    iconColor: "text-blue-600"
  },
  {
    title: "Feedback",
    description: "Share your thoughts",
    icon: MessageSquare,
    href: "/member/feedback",
    gradient: "from-green-500 to-emerald-500",
    iconColor: "text-green-600"
  }
];

const statsCards = [
  {
    title: "5+5",
    description: "Quick game format",
    icon: Star,
    href: "/member/five-five",
    color: "bg-gradient-to-br from-pink-100 to-rose-100 dark:from-pink-950 dark:to-rose-950",
    iconBg: "bg-pink-500"
  },
  {
    title: "Average Score",
    description: "Track your progress",
    icon: TrendingUp,
    href: "/member/average-score",
    color: "bg-gradient-to-br from-purple-100 to-violet-100 dark:from-purple-950 dark:to-violet-950",
    iconBg: "bg-purple-500"
  },
  {
    title: "Mini Blok",
    description: "Small tournaments",
    icon: Award,
    href: "/member/mini-blok",
    color: "bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-950 dark:to-cyan-950",
    iconBg: "bg-blue-500"
  }
];

export default function MemberDashboard() {
  const router = useRouter();
  const { member, loading: authLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || authLoading) {
    return <BowlingBallLoaderOverlay />;
  }

  const displayName = member?.full_name || member?.username || "Member";
  const firstName = displayName.split(" ")[0];

  return (
    <MemberLayout>
      <SEO
        title="Dashboard - AMBC Club"
        description="Your personal bowling dashboard"
      />

      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-purple-950">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-bowling py-12 sm:py-16">
          <div className="absolute inset-0 bg-[url('/api/placeholder/1920/400')] opacity-10 mix-blend-overlay" />
          
          <motion.div 
            className="container mx-auto px-4 relative z-10"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="text-center text-white">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-md rounded-full mb-4"
              >
                <Heart className="h-4 w-4 fill-current" />
                <span className="text-sm font-medium">Welcome Back!</span>
              </motion.div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold mb-4">
                Hello, {firstName}! 🎳
              </h1>
              
              <p className="text-lg sm:text-xl text-white/90 max-w-2xl mx-auto">
                Ready to strike? Let's make today count!
              </p>
            </div>
          </motion.div>

          {/* Decorative Elements */}
          <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8 sm:py-12">
          {/* Quick Stats */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
          >
            {statsCards.map((stat, index) => (
              <motion.div key={stat.title} variants={itemVariants}>
                <Link href={stat.href}>
                  <Card className={`${stat.color} border-none shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-1 cursor-pointer group`}>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className={`${stat.iconBg} w-12 h-12 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                          <stat.icon className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-foreground">
                            {stat.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {stat.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </motion.div>

          {/* Main Features */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-serif font-bold text-gradient-primary">
                  Quick Access
                </h2>
                <p className="text-muted-foreground mt-1">
                  Your bowling essentials
                </p>
              </div>
              <Badge variant="secondary" className="hidden sm:inline-flex">
                <Sparkles className="h-3 w-3 mr-1" />
                {features.length} Features
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <motion.div key={feature.title} variants={itemVariants}>
                  <Link href={feature.href}>
                    <Card className="group elegant-card border-border/50 hover:border-primary/30 bg-card/50 backdrop-blur-sm overflow-hidden">
                      <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                      
                      <CardHeader className="relative">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-300" />
                            <div className="relative w-14 h-14 bg-gradient-to-br from-background to-muted rounded-xl flex items-center justify-center shadow-medium group-hover:scale-110 transition-transform duration-300">
                              <feature.icon className={`h-7 w-7 ${feature.iconColor}`} />
                            </div>
                          </div>
                          
                          <div className="flex-1">
                            <CardTitle className="text-xl font-semibold group-hover:text-primary transition-colors">
                              {feature.title}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                              {feature.description}
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="mt-12"
          >
            <Card className="bg-gradient-elegant border-none shadow-large overflow-hidden">
              <div className="absolute inset-0 bg-[url('/api/placeholder/800/200')] opacity-5 mix-blend-overlay" />
              
              <CardContent className="p-8 relative z-10">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg">
                    <Users className="h-10 w-10 text-primary" />
                  </div>
                  
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="text-2xl font-serif font-bold text-white mb-2">
                      {displayName}
                    </h3>
                    <p className="text-white/80">
                      AMBC Club Member
                    </p>
                  </div>
                  
                  <Link href="/member/profile">
                    <Button size="lg" variant="secondary" className="gap-2 shadow-md hover:shadow-lg">
                      View Profile
                      <Users className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </MemberLayout>
  );
}