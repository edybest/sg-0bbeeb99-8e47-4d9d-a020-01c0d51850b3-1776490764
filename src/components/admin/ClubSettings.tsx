import { useState, useEffect } from "react";
import { 
  Building2, Shield, ShieldCheck,
  ImageIcon, Save, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ClubLogo } from "@/components/ClubLogo";
import { ThemeSettingsPanel } from "./ThemeSettingsPanel";

interface ClubSettings {
  id?: string;
  club_name: string;
  description: string;
  contact_email: string;
  contact_phone: string;
  rules: string;
  require_approval: boolean;
  max_members: number;
}

export function ClubSettings() {
  const [settings, setSettings] = useState<ClubSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const { data, error } = await supabase
        .from('club_settings')
        .select('*');

      if (error) throw error;
      
      if (data && data.length > 0) {
        const parsedSettings: ClubSettings = {
          club_name: "AMBC Club",
          description: "",
          contact_email: "",
          contact_phone: "",
          rules: "",
          require_approval: true,
          max_members: 100
        };

        data.forEach(item => {
          if (item.setting_key === 'club_name') parsedSettings.club_name = item.setting_value || "";
          if (item.setting_key === 'description') parsedSettings.description = item.setting_value || "";
          if (item.setting_key === 'contact_email') parsedSettings.contact_email = item.setting_value || "";
          if (item.setting_key === 'contact_phone') parsedSettings.contact_phone = item.setting_value || "";
          if (item.setting_key === 'rules') parsedSettings.rules = item.setting_value || "";
          if (item.setting_key === 'require_approval') parsedSettings.require_approval = item.setting_value === 'true';
          if (item.setting_key === 'max_members') parsedSettings.max_members = parseInt(item.setting_value || "100", 10);
        });

        setSettings(parsedSettings);
      } else {
        await initializeSettings();
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: "Error",
        description: "Failed to load club settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function initializeSettings() {
    try {
      const defaultSettings = [
        { setting_key: 'club_name', setting_value: 'AMBC Club' },
        { setting_key: 'description', setting_value: 'Welcome to AMBC Bowling Club' },
        { setting_key: 'require_approval', setting_value: 'true' },
        { setting_key: 'max_members', setting_value: '100' }
      ];

      const { error } = await supabase
        .from('club_settings')
        .insert(defaultSettings);

      if (error) throw error;
      await fetchSettings();
    } catch (error) {
      console.error('Error initializing settings:', error);
    }
  }

  const handleSettingChange = (field: keyof ClubSettings, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: value });
  };

  const saveSettings = async () => {
    if (!settings) return;
    
    setSaving(true);
    try {
      const settingsToSave = [
        { setting_key: 'club_name', setting_value: settings.club_name },
        { setting_key: 'description', setting_value: settings.description },
        { setting_key: 'contact_email', setting_value: settings.contact_email },
        { setting_key: 'contact_phone', setting_value: settings.contact_phone },
        { setting_key: 'rules', setting_value: settings.rules },
        { setting_key: 'require_approval', setting_value: String(settings.require_approval) },
        { setting_key: 'max_members', setting_value: String(settings.max_members) }
      ];

      for (const setting of settingsToSave) {
        // Upsert by checking if it exists
        const { data: existing } = await supabase
          .from('club_settings')
          .select('id')
          .eq('setting_key', setting.setting_key)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('club_settings')
            .update({ setting_value: setting.setting_value })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('club_settings')
            .insert([setting]);
        }
      }

      toast({
        title: "Success",
        description: "Club settings have been saved.",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save club settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  if (!settings) {
    return <div className="p-8 text-center text-destructive">Failed to load settings</div>;
  }

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Club Configuration</h2>
        <p className="text-muted-foreground">
          Manage your club's identity, policies, and access controls.
        </p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-3">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            General Info
          </TabsTrigger>
          <TabsTrigger value="policies" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Policies & Rules
          </TabsTrigger>
          <TabsTrigger value="theme" className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            Appearance
          </TabsTrigger>
        </TabsList>

        {/* General Info Tab */}
        <TabsContent value="general" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Update your club's name, description, and contact details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex flex-col items-center gap-4 w-full md:w-1/3">
                  <div className="text-sm font-medium text-muted-foreground w-full text-center">Club Logo</div>
                  <ClubLogo size="xl" />
                  <p className="text-xs text-muted-foreground text-center">
                    To change the logo, replace the ambc-logo.png file in your public folder.
                  </p>
                </div>
                
                <div className="space-y-4 w-full md:w-2/3">
                  <div className="space-y-2">
                    <Label htmlFor="club_name">Club Name</Label>
                    <Input 
                      id="club_name" 
                      value={settings.club_name} 
                      onChange={(e) => handleSettingChange('club_name', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea 
                      id="description" 
                      rows={3}
                      value={settings.description} 
                      onChange={(e) => handleSettingChange('description', e.target.value)}
                      placeholder="Brief description of your bowling club"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contact_email">Contact Email</Label>
                      <Input 
                        id="contact_email" 
                        type="email"
                        value={settings.contact_email} 
                        onChange={(e) => handleSettingChange('contact_email', e.target.value)}
                        placeholder="admin@ambc.club"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact_phone">Contact Phone</Label>
                      <Input 
                        id="contact_phone" 
                        value={settings.contact_phone} 
                        onChange={(e) => handleSettingChange('contact_phone', e.target.value)}
                        placeholder="+60123456789"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Policies & Rules Tab */}
        <TabsContent value="policies" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Membership Policies</CardTitle>
              <CardDescription>
                Configure how new members join and limits for the club.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/20">
                <div className="space-y-0.5">
                  <Label className="text-base">Require Admin Approval</Label>
                  <p className="text-sm text-muted-foreground">
                    New members must be approved by an admin before they can access the portal.
                  </p>
                </div>
                <Switch 
                  checked={settings.require_approval} 
                  onCheckedChange={(checked) => handleSettingChange('require_approval', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_members">Maximum Members Limit</Label>
                <div className="flex items-center gap-4">
                  <Input 
                    id="max_members" 
                    type="number"
                    className="w-32"
                    value={settings.max_members} 
                    onChange={(e) => handleSettingChange('max_members', parseInt(e.target.value))}
                  />
                  <span className="text-sm text-muted-foreground">members</span>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t">
                <Label htmlFor="rules">Club Rules & Guidelines</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  These rules will be displayed to all members in their portal.
                </p>
                <Textarea 
                  id="rules" 
                  rows={8}
                  value={settings.rules} 
                  onChange={(e) => handleSettingChange('rules', e.target.value)}
                  placeholder="1. Be respectful to all members..."
                  className="font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Page Access Information</CardTitle>
              <CardDescription>
                Information about which pages are public vs private.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2 items-start p-4 bg-blue-500/10 border border-blue-500/20 rounded-md text-blue-500 text-sm">
                  <Info className="h-5 w-5 shrink-0 mt-0.5" />
                  <p>
                    <strong>Public Pages (No Login Required):</strong><br />
                    Dashboard, Blok, Couple, Average Score, and Mini Blok are accessible to anyone without logging in.
                  </p>
                </div>
                
                <div className="flex gap-2 items-start p-4 bg-amber-500/10 border border-amber-500/20 rounded-md text-amber-500 text-sm">
                  <ShieldCheck className="h-5 w-5 shrink-0 mt-0.5" />
                  <p>
                    <strong>Private Pages (Login Required):</strong><br />
                    Chat, Gallery, Profile, Training, Five-Five, Hall of Fame, Lane, Undi Lane, dan Feedback require user login and specific permissions.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Theme & Appearance Tab */}
        <TabsContent value="theme" className="pt-4">
          <ThemeSettingsPanel />
        </TabsContent>
      </Tabs>

      {/* Floating Save Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button 
          size="lg" 
          onClick={saveSettings} 
          disabled={saving}
          className="shadow-lg hover:shadow-xl transition-all"
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
              Saving...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Save className="h-5 w-5" />
              Save Changes
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}