import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Image from "next/image";

export function SignupForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    username: "",
    fullName: "",
    phone: "",
    birthday: "",
    sex: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Password tidak sepadan");
      setLoading(false);
      return;
    }

    try {
      // Check if username already exists
      const { data: existingUser } = await supabase
        .from("members")
        .select("username")
        .eq("username", formData.username)
        .single();

      if (existingUser) {
        setError("Username sudah digunakan");
        setLoading(false);
        return;
      }

      // Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Create member record
        const { error: memberError } = await supabase
          .from("members")
          .insert({
            user_id: authData.user.id,
            email: formData.email,
            username: formData.username,
            full_name: formData.fullName,
            phone: formData.phone,
            birthday: formData.birthday,
            sex: formData.sex as "men" | "women",
            is_admin: false,
            is_verified: false
          });

        if (memberError) throw memberError;

        // Show success message
        alert("Pendaftaran berjaya! Sila semak email untuk pengesahan.");
        router.push("/login");
      }
    } catch (err: any) {
      setError(err.message || "Pendaftaran gagal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-950 via-black to-gray-900 p-4">
      <Card className="w-full max-w-2xl bg-black/50 backdrop-blur border-red-900/50">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <Image 
              src="/ambc-logo.png" 
              alt="AMBC Club" 
              width={120} 
              height={120}
              className="drop-shadow-2xl"
            />
          </div>
          <CardTitle className="text-3xl font-bold text-red-500">Daftar AMBC CLUB</CardTitle>
          <CardDescription className="text-gray-400">
            Lengkapkan maklumat untuk mendaftar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-gray-300">Username *</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Username unik"
                  value={formData.username}
                  onChange={(e) => handleChange("username", e.target.value)}
                  required
                  className="bg-gray-900/50 border-gray-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  required
                  className="bg-gray-900/50 border-gray-700 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-gray-300">Nama Penuh *</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Nama penuh"
                value={formData.fullName}
                onChange={(e) => handleChange("fullName", e.target.value)}
                required
                className="bg-gray-900/50 border-gray-700 text-white"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-300">Telefon *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+60123456789"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  required
                  className="bg-gray-900/50 border-gray-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthday" className="text-gray-300">Tarikh Lahir *</Label>
                <Input
                  id="birthday"
                  type="date"
                  value={formData.birthday}
                  onChange={(e) => handleChange("birthday", e.target.value)}
                  required
                  className="bg-gray-900/50 border-gray-700 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sex" className="text-gray-300">Jantina *</Label>
              <Select value={formData.sex} onValueChange={(value) => handleChange("sex", value)} required>
                <SelectTrigger className="bg-gray-900/50 border-gray-700 text-white">
                  <SelectValue placeholder="Pilih jantina" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  <SelectItem value="men" className="text-white">Lelaki</SelectItem>
                  <SelectItem value="women" className="text-white">Perempuan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimum 6 karakter"
                    value={formData.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    required
                    minLength={6}
                    className="bg-gray-900/50 border-gray-700 text-white pr-10"
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
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-300">Sahkan Password *</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Taip semula password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange("confirmPassword", e.target.value)}
                  required
                  className="bg-gray-900/50 border-gray-700 text-white"
                />
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
                  Mendaftar...
                </>
              ) : (
                "Daftar"
              )}
            </Button>

            <div className="text-center text-sm text-gray-400">
              Sudah ada akaun?{" "}
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="text-red-500 hover:text-red-400 font-medium"
              >
                Login sekarang
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}