import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Image from "next/image";

export function LoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Check if identifier is email, username, or phone
      const isEmail = identifier.includes("@");
      const isPhone = /^\+?[0-9]{10,}$/.test(identifier);

      let email = identifier;

      // If username or phone, find the associated email
      if (!isEmail) {
        const { data: member } = await supabase
          .from("members")
          .select("email, user_id")
          .or(isPhone ? `phone.eq.${identifier}` : `username.eq.${identifier}`)
          .single();

        if (!member?.email) {
          setError("Invalid credentials");
          setLoading(false);
          return;
        }

        email = member.email;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      if (data.user) {
        // Check if user is admin
        const { data: member } = await supabase
          .from("members")
          .select("is_admin")
          .eq("user_id", data.user.id)
          .single();

        if (member?.is_admin) {
          router.push("/admin");
        } else {
          router.push("/member");
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-950 via-black to-gray-900 p-4">
      <Card className="w-full max-w-md bg-black/50 backdrop-blur border-red-900/50">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <Image 
              src="/ambc-logo.png" 
              alt="AMBC Club" 
              width={150} 
              height={150}
              className="drop-shadow-2xl"
            />
          </div>
          <CardTitle className="text-3xl font-bold text-red-500">AMBC CLUB</CardTitle>
          <CardDescription className="text-gray-400">
            Login dengan email, username atau phone
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier" className="text-gray-300">Email / Username / Phone</Label>
              <Input
                id="identifier"
                type="text"
                placeholder="Masukkan email, username atau phone"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                className="bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {error && (
              <div className="text-sm text-red-400 bg-red-950/50 border border-red-900 rounded p-3">
                {error}
              </div>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Login"
              )}
            </Button>
            <div className="text-center text-sm text-gray-400">
              Belum ada akaun?{" "}
              <button
                type="button"
                onClick={() => router.push("/signup")}
                className="text-red-500 hover:text-red-400 font-medium"
              >
                Daftar sekarang
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}