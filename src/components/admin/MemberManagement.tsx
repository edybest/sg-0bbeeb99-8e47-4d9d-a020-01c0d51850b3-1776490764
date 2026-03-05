import { useState, useEffect } from "react";
import { memberService } from "@/services/memberService";
import { storageService } from "@/services/storageService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2, UserPlus, Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Image from "next/image";

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
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    full_name: "",
    phone: "",
    birthday: "",
    sex: "men" as "men" | "women",
    bowling_technique: "",
    handicap: 0,
    avatar_base64: ""
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadMembers();
  }, []);

  useEffect(() => {
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

  function openAddDialog() {
    setEditingMember(null);
    setFormData({
      username: "",
      email: "",
      full_name: "",
      phone: "",
      birthday: "",
      sex: "men",
      bowling_technique: "",
      handicap: 0,
      avatar_base64: ""
    });
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
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      let avatarUrl = editingMember?.avatar_url;

      // Upload avatar if provided
      if (formData.avatar_base64) {
        // Convert base64 to File object
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

        // Upload to Supabase Storage
        const userId = editingMember?.id || crypto.randomUUID();
        avatarUrl = await storageService.uploadAvatar(userId, file);
      }

      if (editingMember) {
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
      } else {
        // Admin adds member without auth user (user_id = null)
        // Member can register themselves later and link their account
        await memberService.createMember({
          user_id: null, // ✅ No auth user required when admin adds member
          username: formData.username,
          email: formData.email || null,
          full_name: formData.full_name,
          phone: formData.phone,
          birthday: formData.birthday,
          sex: formData.sex,
          bowling_technique: formData.bowling_technique || null,
          handicap: formData.handicap,
          avatar_url: avatarUrl,
          is_admin: false,
          is_verified: true
        });
      }

      await loadMembers();
      setDialogOpen(false);
    } catch (error) {
      console.error("Error saving member:", error);
      alert("Gagal menyimpan ahli");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string, username: string) {
    if (!confirm(`Adakah anda pasti untuk membuang ahli ${username}?`)) return;

    try {
      await memberService.deleteMember(id);
      await loadMembers();
    } catch (error) {
      console.error("Error deleting member:", error);
      alert("Gagal membuang ahli");
    }
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({ ...prev, avatar_base64: reader.result as string }));
    };
    reader.readAsDataURL(file);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <Card className="bg-black/50 border-red-900/50">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <CardTitle className="text-2xl text-red-500">Pengurusan Ahli</CardTitle>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cari ahli..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-900/50 border-gray-700 text-white"
              />
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAddDialog} className="bg-red-600 hover:bg-red-700 whitespace-nowrap">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Tambah Ahli
                </Button>
              </DialogTrigger>
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
                      <Label htmlFor="email" className="text-gray-300">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="bg-gray-800 border-gray-700"
                      />
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
                      <Label htmlFor="phone" className="text-gray-300">Telefon *</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required
                        className="bg-gray-800 border-gray-700"
                      />
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
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-800">
                <TableHead className="text-gray-300">Avatar</TableHead>
                <TableHead className="text-gray-300">Username</TableHead>
                <TableHead className="text-gray-300">Nama Penuh</TableHead>
                <TableHead className="text-gray-300">Email</TableHead>
                <TableHead className="text-gray-300">Telefon</TableHead>
                <TableHead className="text-gray-300">Jantina</TableHead>
                <TableHead className="text-gray-300">Handicap</TableHead>
                <TableHead className="text-gray-300">Tindakan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => (
                <TableRow key={member.id} className="border-gray-800">
                  <TableCell>
                    {member.avatar_url ? (
                      <Image 
                        src={storageService.getAvatarUrl(member.avatar_url) || member.avatar_url} 
                        alt={member.username} 
                        width={40} 
                        height={40} 
                        className="rounded-full" 
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-gray-400">
                        {member.username[0].toUpperCase()}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-white font-medium">{member.username}</TableCell>
                  <TableCell className="text-gray-300">{member.full_name}</TableCell>
                  <TableCell className="text-gray-300">{member.email || "-"}</TableCell>
                  <TableCell className="text-gray-300">{member.phone}</TableCell>
                  <TableCell className="text-gray-300">{member.sex === "men" ? "Lelaki" : "Perempuan"}</TableCell>
                  <TableCell className="text-gray-300">{member.handicap}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEditDialog(member)} className="border-gray-700">
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(member.id, member.username)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}