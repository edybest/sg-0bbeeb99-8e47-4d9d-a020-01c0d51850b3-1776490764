import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/hooks/useAuth";
import { PageAccessGuard } from "@/components/PageAccessGuard";
import { MobileNav } from "@/components/member/MobileNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { submitFeedback, getMemberFeedback, type FeedbackCategory } from "@/services/feedbackService";
import { storageService } from "@/services/storageService";
import { MessageSquare, Bug, HelpCircle, Send, Upload, X, Check, Clock, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ms } from "date-fns/locale";
import { MemberLayout } from "@/components/member/MemberLayout";
import { SEO } from "@/components/SEO";

const categoryConfig = {
  cadangan: {
    label: "Cadangan",
    icon: MessageSquare,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    description: "Kongsi idea untuk penambahbaikan sistem",
  },
  ralat_sistem: {
    label: "Ralat Sistem",
    icon: Bug,
    color: "text-pink-600",
    bgColor: "bg-pink-50",
    description: "Laporkan masalah atau bug yang anda jumpa",
  },
  pertanyaan_lain: {
    label: "Pertanyaan Lain",
    icon: HelpCircle,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    description: "Tanya soalan atau dapatkan bantuan",
  },
};

const statusConfig = {
  pending: {
    label: "Belum Dibaca",
    icon: Clock,
    color: "text-rose-600",
    bgColor: "bg-rose-100",
  },
  read: {
    label: "Dibaca",
    icon: Check,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  resolved: {
    label: "Selesai",
    icon: CheckCircle2,
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
};

export default function FeedbackPage() {
  const router = useRouter();
  const { member, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [selectedCategory, setSelectedCategory] = useState<FeedbackCategory | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [myFeedback, setMyFeedback] = useState<any[]>([]);
  const [loadingFeedback, setLoadingFeedback] = useState(true);

  useEffect(() => {
    if (member) {
      loadMyFeedback();
    }
  }, [member]);

  const loadMyFeedback = async () => {
    if (!member) return;

    try {
      setLoadingFeedback(true);
      const feedback = await getMemberFeedback(member.id);
      setMyFeedback(feedback);
    } catch (error) {
      console.error("Error loading feedback:", error);
    } finally {
      setLoadingFeedback(false);
    }
  };

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "Fail terlalu besar",
          description: "Saiz gambar maksimum adalah 5MB",
        });
        return;
      }

      setScreenshot(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveScreenshot = () => {
    setScreenshot(null);
    setScreenshotPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!member || !selectedCategory) return;

    if (!subject.trim() || !message.trim()) {
      toast({
        variant: "destructive",
        title: "Maklumat tidak lengkap",
        description: "Sila isi subjek dan mesej",
      });
      return;
    }

    try {
      setSubmitting(true);

      let screenshotUrl: string | undefined;
      if (screenshot) {
        screenshotUrl = await storageService.uploadImage(screenshot, "feedback");
      }

      await submitFeedback(member.id, {
        category: selectedCategory,
        subject: subject.trim(),
        message: message.trim(),
        screenshot_url: screenshotUrl,
      });

      toast({
        title: "Maklum balas dihantar!",
        description: "Terima kasih atas maklum balas anda. Kami akan semak secepat mungkin.",
      });

      // Reset form
      setSelectedCategory(null);
      setSubject("");
      setMessage("");
      setScreenshot(null);
      setScreenshotPreview(null);

      // Reload feedback list
      await loadMyFeedback();
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast({
        variant: "destructive",
        title: "Ralat",
        description: "Gagal menghantar maklum balas. Sila cuba lagi.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">Memuatkan...</p>
        </div>
      </div>
    );
  }

  return (
    <PageAccessGuard pagePath="/member/feedback">
      <SEO title="Feedback - AMBC Club" description="Hantar maklum balas anda" />
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50">
        <MemberLayout>
          <div className="container mx-auto px-4 py-6 pb-24 md:pb-6 max-w-4xl">
            
            {/* Hero Header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-rose-400 via-pink-500 to-purple-500 rounded-3xl shadow-2xl p-8 sm:p-12 mb-8">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-sm font-medium mb-4">
                  <MessageSquare className="w-4 h-4" />
                  <span>Suara Anda</span>
                </div>
                <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-3 tracking-tight drop-shadow-lg">
                  Feedback 💬
                </h1>
                <p className="text-pink-50 text-lg max-w-2xl">
                  Kongsi cadangan dan maklum balas anda dengan kami
                </p>
              </div>
            </div>

            {/* Feedback Form Card */}
            <Card className="border-2 border-pink-200 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-rose-50 to-pink-50">
                <CardTitle className="text-2xl text-rose-900">Hantar Maklum Balas</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Category Selection */}
                  <div className="space-y-3">
                    <Label>Kategori</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {(Object.entries(categoryConfig) as [FeedbackCategory, typeof categoryConfig.cadangan][]).map(
                        ([key, config]) => {
                          const Icon = config.icon;
                          const isSelected = selectedCategory === key;

                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => setSelectedCategory(key)}
                              className={`
                                relative p-4 rounded-lg border-2 transition-all text-left
                                ${
                                  isSelected
                                    ? "border-primary bg-pink-600/5 shadow-sm"
                                    : "border-rose-200 hover:border-rose-300"
                                }
                              `}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg ${config.bgColor}`}>
                                  <Icon className={`w-5 h-5 ${config.color}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm text-rose-900">
                                    {config.label}
                                  </p>
                                  <p className="text-xs text-rose-600 mt-1">
                                    {config.description}
                                  </p>
                                </div>
                              </div>
                              {isSelected && (
                                <motion.div
                                  layoutId="selected-category"
                                  className="absolute inset-0 border-2 border-primary rounded-lg pointer-events-none"
                                  transition={{ type: "spring", duration: 0.5 }}
                                />
                              )}
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>

                  {/* Subject */}
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subjek</Label>
                    <Input
                      id="subject"
                      placeholder="Ringkasan ringkas tentang maklum balas anda"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      disabled={!selectedCategory}
                      maxLength={100}
                    />
                  </div>

                  {/* Message */}
                  <div className="space-y-2">
                    <Label htmlFor="message">Mesej</Label>
                    <Textarea
                      id="message"
                      placeholder="Terangkan dengan lebih lanjut..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      disabled={!selectedCategory}
                      rows={6}
                      maxLength={1000}
                    />
                    <p className="text-xs text-rose-500 text-right">
                      {message.length}/1000 aksara
                    </p>
                  </div>

                  {/* Screenshot Upload */}
                  <div className="space-y-2">
                    <Label>Screenshot (Opsional)</Label>
                    {!screenshotPreview ? (
                      <div>
                        <input
                          type="file"
                          id="screenshot"
                          accept="image/*"
                          onChange={handleScreenshotChange}
                          disabled={!selectedCategory}
                          className="hidden"
                        />
                        <label htmlFor="screenshot">
                          <div className="border-2 border-dashed border-rose-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors">
                            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-rose-600">
                              Klik untuk muat naik gambar
                            </p>
                            <p className="text-xs text-rose-500 mt-1">
                              Maksimum 5MB
                            </p>
                          </div>
                        </label>
                      </div>
                    ) : (
                      <div className="relative">
                        <img
                          src={screenshotPreview}
                          alt="Screenshot preview"
                          className="w-full h-48 object-contain rounded-lg border"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveScreenshot}
                          className="absolute top-2 right-2 p-2 bg-pink-400 text-white rounded-full hover:bg-pink-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={!selectedCategory || !subject.trim() || !message.trim() || submitting}
                    className="w-full"
                  >
                    {submitting ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                        Menghantar...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Hantar Maklum Balas
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* My Feedback History */}
            <Card>
              <CardHeader>
                <CardTitle>Sejarah Maklum Balas Saya</CardTitle>
                <CardDescription>
                  Lihat status maklum balas yang telah dihantar
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingFeedback ? (
                  <div className="text-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
                    <p className="mt-4 text-sm text-muted-foreground">Memuatkan...</p>
                  </div>
                ) : myFeedback.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-rose-600">Belum ada maklum balas dihantar</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myFeedback.map((feedback) => {
                      const category = categoryConfig[feedback.category as FeedbackCategory];
                      const status = statusConfig[feedback.status as keyof typeof statusConfig];
                      const CategoryIcon = category.icon;
                      const StatusIcon = status.icon;

                      return (
                        <div
                          key={feedback.id}
                          className="border rounded-lg p-4 hover:shadow-sm transition-shadow"
                        >
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="flex items-start gap-3 flex-1">
                              <div className={`p-2 rounded-lg ${category.bgColor}`}>
                                <CategoryIcon className={`w-5 h-5 ${category.color}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-rose-900 line-clamp-1">
                                  {feedback.subject}
                                </h3>
                                <p className="text-sm text-rose-600 mt-1">
                                  {category.label}
                                </p>
                              </div>
                            </div>
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${status.bgColor}`}>
                              <StatusIcon className={`w-4 h-4 ${status.color}`} />
                              <span className={`text-xs font-medium ${status.color}`}>
                                {status.label}
                              </span>
                            </div>
                          </div>

                          <p className="text-sm text-rose-700 mb-3 line-clamp-2">
                            {feedback.message}
                          </p>

                          {feedback.screenshot_url && (
                            <div className="mb-3">
                              <img
                                src={feedback.screenshot_url}
                                alt="Feedback screenshot"
                                className="w-full max-w-xs h-32 object-cover rounded-lg border"
                              />
                            </div>
                          )}

                          {feedback.admin_reply && (
                            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                              <p className="text-xs font-semibold text-green-900 mb-1">
                                Balasan Admin:
                              </p>
                              <p className="text-sm text-green-800">
                                {feedback.admin_reply}
                              </p>
                              {feedback.replied_at && (
                                <p className="text-xs text-green-600 mt-2">
                                  {format(new Date(feedback.replied_at), "dd MMM yyyy, hh:mm a", {
                                    locale: ms,
                                  })}
                                </p>
                              )}
                            </div>
                          )}

                          <p className="text-xs text-rose-500 mt-3">
                            Dihantar: {format(new Date(feedback.created_at), "dd MMM yyyy, hh:mm a", {
                              locale: ms,
                            })}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </MemberLayout>
      </div>
    </PageAccessGuard>
  );
}