import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Loader2, 
  Search, 
  UserCheck, 
  UserX, 
  Shield,
  CheckCircle2,
  XCircle 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type MemberWithPermission = {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  has_permission: boolean;
  permission_id: string | null;
};

export function GalleryPermissionsPanel() {
  const [members, setMembers] = useState<MemberWithPermission[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<MemberWithPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    fetchMembersWithPermissions();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      setFilteredMembers(
        members.filter(
          m => 
            m.full_name.toLowerCase().includes(query) || 
            m.username.toLowerCase().includes(query)
        )
      );
    } else {
      setFilteredMembers(members);
    }
  }, [searchQuery, members]);

  async function fetchMembersWithPermissions() {
    try {
      setLoading(true);

      // Fetch all non-admin members
      const { data: membersData, error: membersError } = await supabase
        .from("members")
        .select("id, full_name, username, avatar_url")
        .eq("is_admin", false)
        .order("full_name");

      if (membersError) throw membersError;

      // Fetch all gallery permissions
      const { data: permissionsData, error: permissionsError } = await supabase
        .from("gallery_permissions")
        .select("id, member_id");

      if (permissionsError) throw permissionsError;

      // Create a map of member_id -> permission_id
      const permissionsMap = new Map(
        (permissionsData || []).map(p => [p.member_id, p.id])
      );

      // Combine data
      const membersWithPermissions: MemberWithPermission[] = (membersData || []).map(member => ({
        id: member.id,
        full_name: member.full_name,
        username: member.username,
        avatar_url: member.avatar_url,
        has_permission: permissionsMap.has(member.id),
        permission_id: permissionsMap.get(member.id) || null
      }));

      setMembers(membersWithPermissions);
      setFilteredMembers(membersWithPermissions);
    } catch (error: any) {
      console.error("Error fetching members:", error);
      toast({
        variant: "destructive",
        title: "Ralat",
        description: "Gagal memuat senarai ahli"
      });
    } finally {
      setLoading(false);
    }
  }

  async function togglePermission(member: MemberWithPermission) {
    setUpdatingIds(prev => new Set(prev).add(member.id));

    try {
      if (member.has_permission) {
        // Revoke permission
        const { error } = await supabase
          .from("gallery_permissions")
          .delete()
          .eq("id", member.permission_id!);

        if (error) throw error;

        toast({
          title: "Kebenaran Dibatalkan",
          description: `${member.full_name} tidak lagi boleh urus galeri`
        });
      } else {
        // Grant permission
        const { error } = await supabase
          .from("gallery_permissions")
          .insert({
            member_id: member.id
          });

        if (error) throw error;

        toast({
          title: "Kebenaran Diberi",
          description: `${member.full_name} kini boleh urus galeri`
        });
      }

      // Refresh list
      await fetchMembersWithPermissions();
    } catch (error: any) {
      console.error("Error toggling permission:", error);
      toast({
        variant: "destructive",
        title: "Ralat",
        description: "Gagal mengubah kebenaran"
      });
    } finally {
      setUpdatingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(member.id);
        return newSet;
      });
    }
  }

  async function grantAllPermissions() {
    try {
      const membersWithoutPermission = members.filter(m => !m.has_permission);
      
      if (membersWithoutPermission.length === 0) {
        toast({
          title: "Tiada Perubahan",
          description: "Semua ahli sudah mempunyai kebenaran galeri"
        });
        return;
      }

      const { error } = await supabase
        .from("gallery_permissions")
        .insert(
          membersWithoutPermission.map(m => ({ member_id: m.id }))
        );

      if (error) throw error;

      toast({
        title: "Kebenaran Diberi",
        description: `${membersWithoutPermission.length} ahli kini boleh urus galeri`
      });

      await fetchMembersWithPermissions();
    } catch (error: any) {
      console.error("Error granting all permissions:", error);
      toast({
        variant: "destructive",
        title: "Ralat",
        description: "Gagal memberi kebenaran kepada semua ahli"
      });
    }
  }

  async function revokeAllPermissions() {
    try {
      const membersWithPermission = members.filter(m => m.has_permission);
      
      if (membersWithPermission.length === 0) {
        toast({
          title: "Tiada Perubahan",
          description: "Tiada ahli mempunyai kebenaran galeri"
        });
        return;
      }

      const { error } = await supabase
        .from("gallery_permissions")
        .delete()
        .in("member_id", membersWithPermission.map(m => m.id));

      if (error) throw error;

      toast({
        title: "Kebenaran Dibatalkan",
        description: `${membersWithPermission.length} ahli tidak lagi boleh urus galeri`
      });

      await fetchMembersWithPermissions();
    } catch (error: any) {
      console.error("Error revoking all permissions:", error);
      toast({
        variant: "destructive",
        title: "Ralat",
        description: "Gagal membatalkan semua kebenaran"
      });
    }
  }

  const permissionCount = members.filter(m => m.has_permission).length;
  const totalMembers = members.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jumlah Ahli</CardTitle>
            <Shield className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMembers}</div>
            <p className="text-xs text-gray-500 mt-1">Tidak termasuk admin</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ada Kebenaran</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{permissionCount}</div>
            <p className="text-xs text-gray-500 mt-1">Boleh urus galeri</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tiada Kebenaran</CardTitle>
            <UserX className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{totalMembers - permissionCount}</div>
            <p className="text-xs text-gray-500 mt-1">Hanya boleh lihat</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <Card>
        <CardHeader>
          <CardTitle>Urus Kebenaran Galeri</CardTitle>
          <CardDescription>
            Tetapkan ahli yang boleh upload, edit, dan delete gambar dalam galeri
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cari nama atau username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={grantAllPermissions}
                className="border-green-600 text-green-600 hover:bg-green-50"
              >
                <UserCheck className="h-4 w-4 mr-2" />
                Beri Semua
              </Button>
              <Button
                variant="outline"
                onClick={revokeAllPermissions}
                className="border-red-600 text-red-600 hover:bg-red-50"
              >
                <UserX className="h-4 w-4 mr-2" />
                Batal Semua
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Members List */}
      <Card>
        <CardContent className="p-0">
          {filteredMembers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {searchQuery ? "Tiada ahli dijumpai" : "Tiada ahli berdaftar"}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredMembers.map(member => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={member.avatar_url || undefined} alt={member.full_name} />
                      <AvatarFallback className="bg-red-100 text-red-600">
                        {member.full_name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {member.full_name}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        @{member.username}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {member.has_permission ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Boleh Urus
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                          <XCircle className="h-3 w-3 mr-1" />
                          Lihat Sahaja
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="ml-4">
                    <Switch
                      checked={member.has_permission}
                      onCheckedChange={() => togglePermission(member)}
                      disabled={updatingIds.has(member.id)}
                      className="data-[state=checked]:bg-green-600"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800 space-y-2">
              <p className="font-medium">Nota Penting:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>Admin sentiasa mempunyai akses penuh kepada galeri</li>
                <li>Ahli dengan kebenaran boleh create/edit/delete album dan gambar</li>
                <li>Ahli tanpa kebenaran hanya boleh view galeri sahaja</li>
                <li>Perubahan kebenaran berkuat kuasa serta-merta</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}