import { SEO } from "@/components/SEO";
import { ClubLogo } from "@/components/ClubLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Users, Shield } from "lucide-react";

export default function LoginPage() {
  return (
    <>
      <SEO 
        title="Login - AMBC Club"
        description="Login to AMBC Club member or admin portal"
      />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-red-50 p-4">
        <Card className="w-full max-w-md shadow-2xl border-2 border-red-100">
          <CardHeader className="text-center space-y-6 pb-8">
            <div className="flex justify-center">
              <ClubLogo size="lg" />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold text-red-600 mb-2">
                AMBC CLUB
              </CardTitle>
              <CardDescription className="text-base text-gray-600">
                Pilih cara untuk login
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pb-8">
            {/* Member Login Button */}
            <Link href="/member/login" className="block">
              <Button 
                className="w-full h-16 text-lg font-semibold bg-red-600 hover:bg-red-700 text-white transition-all duration-300 hover:scale-[1.02] shadow-lg hover:shadow-xl"
                size="lg"
              >
                <Users className="h-6 w-6 mr-3" />
                Login Sebagai Ahli
              </Button>
            </Link>

            {/* Admin Login Button */}
            <Link href="/admin/login" className="block">
              <Button 
                className="w-full h-16 text-lg font-semibold bg-gray-800 hover:bg-gray-900 text-white transition-all duration-300 hover:scale-[1.02] shadow-lg hover:shadow-xl"
                size="lg"
              >
                <Shield className="h-6 w-6 mr-3" />
                Login Sebagai Admin
              </Button>
            </Link>

            {/* Divider */}
            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">Atau</span>
              </div>
            </div>

            {/* Signup Link */}
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-3">
                Belum ada akaun?
              </p>
              <Link href="/signup">
                <Button 
                  variant="outline" 
                  className="w-full border-2 border-red-600 text-red-600 hover:bg-red-50 hover:text-red-700 font-semibold"
                  size="lg"
                >
                  Daftar Sekarang
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}