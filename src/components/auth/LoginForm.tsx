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
      console.log("Starting login process for:", identifier);

      // Check if identifier is email, username, or phone
      const isEmail = identifier.includes("@");
      const isPhone = /^\+?[0-9]{10,}$/.test(identifier);

      let email = identifier;

      // If username or phone, find the associated email
      if (!isEmail) {
        console.log("Looking up member by username/phone...");
        const { data: member, error: memberError } = await supabase
          .from("members")
          .select("email")
          .or(isPhone ? `phone.eq.${identifier}` : `username.eq.${identifier}`)
          .single();

        console.log("Member lookup result:", { member, memberError });

        if (memberError || !member?.email) {
          setError("Username atau phone tidak dijumpai");
          setLoading(false);
          return;
        }

        email = member.email;
        console.log("Found email:", email);
      }

      // Attempt login with email and password
      console.log("Attempting auth login with email:", email);
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      console.log("Auth result:", { authData, authError });

      if (authError) {
        console.error("Auth error:", authError);
        setError("Email atau password tidak tepat");
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setError("Login gagal");
        setLoading(false);
        return;
      }

      console.log("Login successful! User ID:", authData.user.id);

      // Check if user is admin
      console.log("Checking admin status...");
      const { data: member, error: memberError } = await supabase
        .from("members")
        .select("is_admin, username")
        .eq("user_id", authData.user.id)
        .single();

      console.log("Admin check result:", { member, memberError });

      // Redirect based on admin status
      if (member?.is_admin) {
        console.log("Redirecting to admin dashboard...");
        await router.push("/admin");
      } else {
        console.log("Redirecting to member area...");
        await router.push("/member");
      }

    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "Login gagal. Cuba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <Card className="w-full max-w-md shadow-xl border-gray-200">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <Image 
              src="/ambc-logo.png" 
              alt="AMBC Club" 
              width={150} 
              height={150}
              className="drop-shadow-lg"
            />
          </div>
          <CardTitle className="text-3xl font-bold text-red-600">AMBC CLUB</CardTitle>
          <CardDescription className="text-gray-600">
            Login dengan email, username atau phone
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier" className="text-gray-700">Email / Username / Phone</Label>
              <Input
                id="identifier"
                type="text"
                placeholder="Masukkan email, username atau phone"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
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
            <div className="text-center text-sm text-gray-600">
              Belum ada akaun?{" "}
              <button
                type="button"
                onClick={() => router.push("/signup")}
                className="text-red-600 hover:text-red-700 font-medium"
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