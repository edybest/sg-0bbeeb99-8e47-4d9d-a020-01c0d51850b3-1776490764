import { useState, useEffect } from "react";
import { memberService } from "@/services/memberService";
import { storageService } from "@/services/storageService";
import { authService } from "@/services/authService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Pencil, Trash2, UserPlus, Search, Loader2, ShieldCheck, ShieldAlert, Plus, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { useRef } from "react";

type Member = {
  id: string;
  username: string;
  email: string | null;
  full_name: string;
  phone: string;
  birthday: string;
  sex: "men" | "women";
  avatar_url: string | null;
  bowling_technique: string | null;
  handicap: number;
  is_admin: boolean;
  is_verified: boolean;
};

export function MemberManagement() {
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    full_name: "",
    phone: "+60",
    birthday: "",
    sex: "men" as "men" | "women",
    bowling_technique: "",
    handicap: 0,
    avatar_base64: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const [isUploadingCsv, setIsUploadingCsv] = useState(false);
  const [csvProgress, setCsvProgress] = useState({ current: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper function to check if avatar is base64
  const isBase64Image = (url: string | null) => {
    if (!url) return false;
    return url.startsWith("data:image/");
  };

  useEffect(() => {
    loadMembers();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    filterMembers();
  }, [searchQuery, members]);

  async function loadMembers() {
    try {
      const data = await memberService.getAllMembers();
      setMembers(data as Member[]);
      setFilteredMembers(data as Member[]);
    } catch (error) {
      console.error("Error loading members:", error);
    } finally {
      setLoading(false);
    }
  }

  function filterMembers() {
    if (!searchQuery) {
      setFilteredMembers(members);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = members.filter(
      (m) =>
        m.username?.toLowerCase().includes(query) ||
        m.full_name?.toLowerCase().includes(query) ||
        m.email?.toLowerCase().includes(query) ||
        m.phone?.toLowerCase().includes(query)
    );
    setFilteredMembers(filtered);
  }

  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentMembers = filteredMembers.slice(startIndex, endIndex);

  function openAddDialog() {
    setEditingMember(null);
    setFormData({
      username: "",
      email: "",
      full_name: "",
      phone: "+60",
      birthday: "",
      sex: "men",
      bowling_technique: "",
      handicap: 0,
      avatar_base64: ""
    });
    setAvatarPreview(null);
    setDialogOpen(true);
  }

  function openEditDialog(member: Member) {
    setEditingMember(member);
    setFormData({
      username: member.username,
      email: member.email || "",
      full_name: member.full_name,
      phone: member.phone,
      birthday: member.birthday,
      sex: member.sex,
      bowling_technique: member.bowling_technique || "",
      handicap: member.handicap,
      avatar_base64: ""
    });
    setAvatarPreview(member.avatar_url);
    setDialogOpen(true);
  }

  function formatPhoneNumber(value: string): string {
    let cleaned = value.replace(/[^\d+]/g, "");
    
    if (!cleaned.startsWith("+")) {
      if (cleaned.startsWith("0")) {
        cleaned = cleaned.substring(1);
      }
      cleaned = "+60" + cleaned;
    }
    
    if (!cleaned.startsWith("+60")) {
      cleaned = "+60" + cleaned.replace(/^\+/, "");
    }
    
    return cleaned;
  }

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData({ ...formData, phone: formatted });
  }

  const parseCSV = (csvText: string) => {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    
    return lines.slice(1).map(line => {
      const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/^"|"$/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((h, i) => {
        row[h] = values[i] || '';
      });
      return row;
    });
  };

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCsv(true);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      
      const toProcess = rows.filter(r => {
        const name = r['name'] || r['player'] || '';
        return name.length > 0;
      });

      if (toProcess.length === 0) {
        toast({
          title: "Format Tidak Sah",
          description: "Sila pastikan CSV anda mempunyai lajur 'name' atau 'player'.",
          variant: "destructive"
        });
        setIsUploadingCsv(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      setCsvProgress({ current: 0, total: toProcess.length });

      let successCount = 0;
      let failCount = 0;
      const failReasons: string[] = [];

      for (let i = 0; i < toProcess.length; i++) {
        const row = toProcess[i];
        
        const username = row['name'] || row['player'] || '';
        const email = row['email'] || `${username.replace(/\s+/g, '').toLowerCase()}@ambc.club`;
        
        const firstName = row['firstname'] || '';
        const lastName = row['lastname'] || '';
        let fullName = (firstName + ' ' + lastName).trim();
        if (!fullName) fullName = username;

        const rawPhone = row['phone'] || '';
        let phone = formatPhoneNumber(rawPhone);
        if (phone === "+60" || !phone) phone = "+60000000000";

        let birthday = row['birthday'] || row['dob'] || '0001-01-01';
        birthday = birthday.replace(/\//g, '-');

        const rawSex = row['jantina'] || row['sex'];
        let sex = 'men';
        if (rawSex === '1' || rawSex?.toLowerCase() === 'female' || rawSex?.toLowerCase() === 'perempuan' || rawSex?.toLowerCase() === 'f') {
          sex = 'women';
        }

        const bowlingTechnique = row['teknik bowling'] || row['teknik'] || '';
        const handicap = parseInt(row['handicap'] || row['hcp']) || 0;

        try {
          const response = await fetch("/api/admin-create-member", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: email,
              memberData: {
                username: username,
                full_name: fullName,
                phone: phone,
                birthday: birthday,
                sex: sex,
                bowling_technique: bowlingTechnique || null,
                handicap: handicap,
                avatar_url: null,
              },
            }),
          });

          const data = await response.json();

          if (response.ok) {
            successCount++;
          } else {
            failCount++;
            const errorMsg = data.details || data.error || "Ralat tidak diketahui";
            failReasons.push(`${username}: ${errorMsg}`);
            console.error(`Failed to create ${username}:`, data);
          }
        } catch (err: any) {
          failCount++;
          failReasons.push(`${username}: ${err.message}`);
          console.error(`Error creating ${username}:`, err);
        }

        setCsvProgress({ current: i + 1, total: toProcess.length });
      }

      toast({
        title: "Selesai Muat Naik CSV",
        description: (
          <div className="mt-2 space-y-2">
            <p>Berjaya: {successCount} | Gagal: {failCount}</p>
            {failReasons.length > 0 && (
              <div className="max-h-32 overflow-y-auto bg-red-50 text-red-800 p-2 rounded text-xs">
                <p className="font-bold mb-1">Punca Kegagalan:</p>
                <ul className="list-disc pl-4">
                  {failReasons.slice(0, 10).map((r, idx) => (
                    <li key={idx}>{r}</li>
                  ))}
                  {failReasons.length > 10 && (
                    <li>...dan {failReasons.length - 10} lagi</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        ),
        duration: 10000, // Show longer so user can read
        variant: failCount > 0 ? "destructive" : "default"
      });

      await loadMembers();
    } catch (error: any) {
      console.error("Error parsing CSV:", error);
      toast({
        title: "Ralat CSV",
        description: "Gagal membaca fail CSV. Sila semak format.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingCsv(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function handleManualVerify(memberId: string, username: string) {
    if (!confirm(`Sahkan ahli ${username} secara manual (bypass OTP)?`)) return;

    setVerifying(memberId);
    try {
      const result = await authService.adminVerifyMember(memberId);
      
      if (result.error) {
        throw result.error;
      }

      toast({
        title: "✅ Berjaya",
        description: `${username} telah disahkan secara manual!`,
        duration: 3000,
      });

      await loadMembers();
    } catch (error: any) {
      console.error("Error verifying member:", error);
      toast({
        title: "❌ Gagal",
        description: error.message || "Gagal mengesahkan ahli",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setVerifying(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      let avatarUrl = editingMember?.avatar_url;

      // Handle avatar upload if needed
      if (formData.avatar_base64) {
        const base64Data = formData.avatar_base64.split(",")[1];
        const mimeType = formData.avatar_base64.split(";")[0].split(":")[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });
        const file = new File([blob], `avatar.${mimeType.split("/")[1]}`, { type: mimeType });

        const userId = editingMember?.id || crypto.randomUUID();
        avatarUrl = await storageService.uploadAvatar(userId, file);
      }

      if (editingMember) {
        // ✅ UPDATE existing member (no auth user changes)
        await memberService.updateMember(editingMember.id, {
          username: formData.username,
          email: formData.email || null,
          full_name: formData.full_name,
          phone: formData.phone,
          birthday: formData.birthday,
          sex: formData.sex,
          bowling_technique: formData.bowling_technique || null,
          handicap: formData.handicap,
          avatar_url: avatarUrl
        });

        toast({
          title: "✅ Berjaya",
          description: "Ahli telah dikemaskini",
          duration: 3000,
        });
      } else {
        // ✅ CREATE new member WITH auth user via admin API
        console.log("Creating new member with auth user...");

        // Validate email is provided for new members
        if (!formData.email) {
          toast({
            title: "❌ Email Diperlukan",
            description: "Email diperlukan untuk membuat akaun ahli baru",
            variant: "destructive",
            duration: 3000,
          });
          setSubmitting(false);
          return;
        }

        const response = await fetch("/api/admin-create-member", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: formData.email,
            memberData: {
              username: formData.username,
              full_name: formData.full_name,
              phone: formData.phone,
              birthday: formData.birthday,
              sex: formData.sex,
              bowling_technique: formData.bowling_technique || null,
              handicap: formData.handicap,
              avatar_url: avatarUrl,
            },
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to create member");
        }

        console.log("✅ Member created with auth user:", data.data);

        toast({
          title: "✅ Berjaya",
          description: "Ahli baru telah ditambah dengan akaun auth",
          duration: 3000,
        });
      }

      await loadMembers();
      setDialogOpen(false);
      
      // Reset form states after successful save
      setEditingMember(null);
      setAvatarPreview(null);
      setFormData({
        username: "",
        email: "",
        full_name: "",
        phone: "+60",
        birthday: "",
        sex: "men",
        bowling_technique: "",
        handicap: 0,
        avatar_base64: ""
      });

    } catch (error: any) {
      console.error("Error saving member:", error);
      toast({
        title: "❌ Gagal",
        description: error.message || "Gagal menyimpan ahli",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string, username: string) {
    if (!confirm(`Adakah anda pasti untuk membuang ahli ${username}?`)) return;

    try {
      await memberService.deleteMember(id);
      await loadMembers();
      
      toast({
        title: "✅ Berjaya",
        description: `${username} telah dibuang`,
        duration: 3000,
      });
    } catch (error) {
      console.error("Error deleting member:", error);
      toast({
        title: "❌ Gagal",
        description: "Gagal membuang ahli",
        variant: "destructive",
        duration: 3000,
      });
    }
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "❌ Ralat",
        description: "Sila pilih fail gambar yang sah (JPG, PNG, GIF)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "❌ Ralat",
        description: "Saiz gambar mesti kurang dari 2MB",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploadingAvatar(true);

      // Convert image to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setAvatarPreview(base64String);
        
        // Update form data
        if (editingMember) {
          setEditingMember({ ...editingMember, avatar_url: base64String });
        } else {
          setFormData({ ...formData, avatar_base64: base64String });
        }

        toast({
          title: "✅ Berjaya!",
          description: "Avatar dipilih. Sila simpan untuk kemaskini.",
        });
      };

      reader.onerror = () => {
        throw new Error("Gagal membaca fail gambar");
      };

      reader.readAsDataURL(file);
    } catch (error: any) {
      toast({
        title: "❌ Ralat",
        description: error.message || "Gagal upload avatar",
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Member Management</h2>
          <p className="text-gray-600 mt-1">Manage club members and their profiles</p>
        </div>
        <div className="flex gap-2">
          <input 
            type="file" 
            accept=".csv" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
          />
          <Button 
            onClick={() => fileInputRef.current?.click()} 
            variant="outline" 
            className="border-gray-300 text-gray-700 hover:bg-gray-100"
            disabled={isUploadingCsv}
          >
            {isUploadingCsv ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            {isUploadingCsv ? `Muat Naik... (${csvProgress.current}/${csvProgress.total})` : "Upload CSV"}
          </Button>
          <Button onClick={() => setDialogOpen(true)} className="bg-red-600 hover:bg-red-700 text-white">
            <UserPlus className="w-4 h-4 mr-2" />
            Add Member
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <Card className="bg-white border-gray-200">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by username, email, or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white border-gray-300 text-gray-900"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Members Table */}
      <Card className="bg-white border-gray-200">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Member</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Details</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {currentMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {member.avatar_url ? (
                        isBase64Image(member.avatar_url) ? (
                          <img 
                            src={member.avatar_url} 
                            alt={member.username} 
                            className="w-10 h-10 rounded-full object-cover" 
                          />
                        ) : (
                          <Image 
                            src={member.avatar_url} 
                            alt={member.username} 
                            width={40} 
                            height={40} 
                            className="rounded-full object-cover" 
                          />
                        )
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-gray-400">
                          {member.username[0].toUpperCase()}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{member.username}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{member.full_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{member.email || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{member.phone}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {member.is_verified ? (
                        <div className="flex items-center gap-1 text-green-500">
                          <ShieldCheck className="h-4 w-4" />
                          <span className="text-xs">Verified</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-yellow-500">
                          <ShieldAlert className="h-4 w-4" />
                          <span className="text-xs">Pending</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-500">
                      <div className="flex gap-2">
                        {!member.is_verified && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleManualVerify(member.id, member.username)}
                            disabled={verifying === member.id}
                            className="border-green-700 text-green-500 hover:bg-green-900/20"
                            title="Sahkan secara manual (bypass OTP)"
                          >
                            {verifying === member.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <ShieldCheck className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => openEditDialog(member)} className="border-gray-700">
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(member.id, member.username)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {currentMembers.length === 0 && (
            <div className="text-center py-12">
              <UserPlus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No members found</p>
              <p className="text-gray-500 text-sm mt-1">Try adjusting your search or add a new member</p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="py-4 border-t border-gray-200">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink 
                        onClick={() => setCurrentPage(i + 1)}
                        isActive={currentPage === i + 1}
                        className="cursor-pointer"
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-gray-900 border-red-900/50 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-red-500">
              {editingMember ? "Edit Ahli" : "Tambah Ahli Baru"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-gray-300">Username *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  className="bg-gray-800 border-gray-700"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required={!editingMember}
                  disabled={!!editingMember}
                  className="bg-gray-800 border-gray-700"
                />
                {!editingMember && (
                  <p className="text-xs text-gray-500">
                    Email diperlukan untuk membuat akaun auth member. Member akan login menggunakan WhatsApp TAC.
                  </p>
                )}
                {editingMember && (
                  <p className="text-xs text-yellow-500">
                    Email tidak boleh diubah selepas akaun dicipta
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-gray-300">Nama Penuh *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
                className="bg-gray-800 border-gray-700"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-300">Telefon (WhatsApp) *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  placeholder="+60123456789"
                  required
                  className="bg-gray-800 border-gray-700"
                />
                <p className="text-xs text-gray-500">Format: +60XXXXXXXXX (untuk WhatsApp OTP)</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthday" className="text-gray-300">Tarikh Lahir *</Label>
                <Input
                  id="birthday"
                  type="date"
                  value={formData.birthday}
                  onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                  required
                  className="bg-gray-800 border-gray-700"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sex" className="text-gray-300">Jantina *</Label>
              <Select value={formData.sex} onValueChange={(value: "men" | "women") => setFormData({ ...formData, sex: value })}>
                <SelectTrigger className="bg-gray-800 border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="men">Lelaki</SelectItem>
                  <SelectItem value="women">Perempuan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatar" className="text-gray-300">Avatar</Label>
              <Input
                id="avatar"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="bg-gray-800 border-gray-700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bowling_technique" className="text-gray-300">Teknik Bowling</Label>
              <Input
                id="bowling_technique"
                value={formData.bowling_technique}
                onChange={(e) => setFormData({ ...formData, bowling_technique: e.target.value })}
                className="bg-gray-800 border-gray-700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="handicap" className="text-gray-300">Handicap</Label>
              <Input
                id="handicap"
                type="number"
                value={formData.handicap}
                onChange={(e) => setFormData({ ...formData, handicap: parseInt(e.target.value) || 0 })}
                className="bg-gray-800 border-gray-700"
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={submitting} className="flex-1 bg-red-600 hover:bg-red-700">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : editingMember ? "Simpan" : "Tambah"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                Batal
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}