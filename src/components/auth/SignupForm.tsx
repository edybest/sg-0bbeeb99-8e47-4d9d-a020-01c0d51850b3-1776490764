import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from "lucide-react";
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
  const [success, setSuccess] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    if (formData.password !== formData.confirmPassword) {
      setError("Password tidak sepadan");
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError("Password mesti sekurang-kurangnya 6 karakter");
      setLoading(false);
      return;
    }

    try {
      // Check if username already exists
      const { data: existingUser } = await supabase
        .from("members")
        .select("username")
        .eq("username", formData.username)
        .maybeSingle();

      if (existingUser) {
        setError("Username sudah digunakan. Sila pilih username lain.");
        setLoading(false);
        return;
      }

      // Check if email already exists
      const { data: existingEmail } = await supabase
        .from("members")
        .select("email")
        .eq("email", formData.email)
        .maybeSingle();

      if (existingEmail) {
        setError("Email sudah didaftarkan. Sila gunakan email lain atau login.");
        setLoading(false);
        return;
      }

      // Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
          data: {
            username: formData.username,
            full_name: formData.fullName,
          }
        }
      });

      if (authError) {
        // Handle rate limit gracefully
        if (authError.message?.includes("rate limit") || authError.message?.includes("Email rate limit exceeded")) {
          // Still create member record even if email fails
          const { error: memberError } = await supabase
            .from("members")
            .insert({
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

          setSuccess(true);
          setError("⚠️ Email verification rate limit. Akaun telah dibuat! Sila login menggunakan username untuk bypass OTP atau hubungi admin untuk verify manual.");
          
          // Redirect after 5 seconds
          setTimeout(() => {
            router.push("/login");
          }, 5000);
          return;
        }
        throw authError;
      }

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

        // Success
        setSuccess(true);
      }
    } catch (err: any) {
      console.error("Signup error:", err);
      setError(err.message || "Pendaftaran gagal. Sila cuba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <Card className="w-full max-w-2xl shadow-xl border-gray-200">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <Image 
              src="/ambc-logo.png" 
              alt="AMBC Club" 
              width={120} 
              height={120}
              className="drop-shadow-lg"
            />
          </div>
          <CardTitle className="text-3xl font-bold text-red-600">Daftar AMBC CLUB</CardTitle>
          <CardDescription className="text-gray-600">
            Lengkapkan maklumat untuk mendaftar
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-6 text-center py-8">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-green-700">Pendaftaran Berjaya! 🎉</h3>
                <p className="text-gray-600">
                  Akaun anda telah berjaya didaftarkan.
                </p>
              </div>

              <Alert className="border-blue-500 bg-blue-50">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>Langkah seterusnya:</strong>
                  <ul className="mt-2 space-y-1 text-sm list-disc list-inside text-left">
                    <li>Semak email untuk <strong>kod verification</strong> (check spam/junk folder)</li>
                    <li>Atau terus <strong>login menggunakan username</strong> untuk skip OTP</li>
                    <li>Hubungi admin jika tidak terima email selepas 10 minit</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <Button
                  onClick={() => router.push("/login")}
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  Login Sekarang
                </Button>
                
                <p className="text-sm text-gray-500">
                  Redirect automatically dalam 5 saat...
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-gray-700">Username *</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Username unik"
                    value={formData.username}
                    onChange={(e) => handleChange("username", e.target.value)}
                    required
                    className="bg-white border-gray-300 text-gray-900"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@example.com"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    required
                    className="bg-white border-gray-300 text-gray-900"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-gray-700">Nama Penuh *</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Nama penuh"
                  value={formData.fullName}
                  onChange={(e) => handleChange("fullName", e.target.value)}
                  required
                  className="bg-white border-gray-300 text-gray-900"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-gray-700">Telefon *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+60123456789"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    required
                    className="bg-white border-gray-300 text-gray-900"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthday" className="text-gray-700">Tarikh Lahir *</Label>
                  <Input
                    id="birthday"
                    type="date"
                    value={formData.birthday}
                    onChange={(e) => handleChange("birthday", e.target.value)}
                    required
                    className="bg-white border-gray-300 text-gray-900"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sex" className="text-gray-700">Jantina *</Label>
                <Select value={formData.sex} onValueChange={(value) => handleChange("sex", value)} required>
                  <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                    <SelectValue placeholder="Pilih jantina" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-300">
                    <SelectItem value="men" className="text-gray-900">Lelaki</SelectItem>
                    <SelectItem value="women" className="text-gray-900">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700">Password *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimum 6 karakter"
                      value={formData.password}
                      onChange={(e) => handleChange("password", e.target.value)}
                      required
                      minLength={6}
                      className="bg-white border-gray-300 text-gray-900 pr-10"
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
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-gray-700">Sahkan Password *</Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Taip semula password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange("confirmPassword", e.target.value)}
                    required
                    className="bg-white border-gray-300 text-gray-900"
                  />
                </div>
              </div>

              {error && (
                <Alert variant={error.includes("⚠️") ? "default" : "destructive"}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
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

              <div className="text-center text-sm text-gray-600">
                Sudah ada akaun?{" "}
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="text-red-600 hover:text-red-700 font-medium"
                >
                  Login sekarang
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}