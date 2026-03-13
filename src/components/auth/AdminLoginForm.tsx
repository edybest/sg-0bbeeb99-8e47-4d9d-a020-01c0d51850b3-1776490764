"use client";

import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { memberService } from "@/services/memberService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ShieldCheck } from "lucide-react";

export function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError("Sila isi email dan password");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Login with Supabase Auth
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim()
      });

      if (authError) throw authError;

      if (!data.user) {
        throw new Error("Login gagal");
      }

      // Check if user is admin
      const member = await memberService.getMemberByUserId(data.user.id);

      if (!member || !member.is_admin) {
        // Not an admin, logout immediately
        await supabase.auth.signOut();
        throw new Error("Anda tidak mempunyai akses admin");
      }

      // Redirect to admin dashboard
      router.push("/admin");
    } catch (err: any) {
      console.error("Admin login error:", err);
      setError(err.message || "Email atau password tidak sah");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <ShieldCheck className="h-12 w-12 text-red-600 dark:text-red-500" />
        </div>
        <CardTitle className="text-2xl">Admin Login</CardTitle>
        <CardDescription>
          Login dengan email dan password admin
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@ambc.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full"
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

          <div className="text-center text-sm text-muted-foreground">
            <p>Member? <Link href="/login" className="text-red-600 dark:text-red-500 hover:underline">Login di sini</Link></p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}