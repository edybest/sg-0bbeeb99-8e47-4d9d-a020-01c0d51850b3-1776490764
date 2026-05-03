import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import {
  getAllCommands,
  createCommand,
  updateCommand,
  deleteCommand,
  toggleCommandStatus,
} from "@/services/whatsappCommandService";

type WhatsAppCommand = Database["public"]["Tables"]["whatsapp_commands"]["Row"];

export function WhatsAppCommandsPanel() {
  const { toast } = useToast();
  const [commands, setCommands] = useState<WhatsAppCommand[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCommand, setEditingCommand] = useState<WhatsAppCommand | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [commandToDelete, setCommandToDelete] = useState<WhatsAppCommand | null>(null);

  const [formData, setFormData] = useState({
    command_key: "",
    command_trigger: "",
    response_message: "",
    is_active: true,
    is_hidden: false,
    description: "",
  });

  useEffect(() => {
    loadCommands();
  }, []);

  async function loadCommands() {
    try {
      setLoading(true);
      const data = await getAllCommands();
      setCommands(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load WhatsApp commands",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      command_key: "",
      command_trigger: "",
      response_message: "",
      is_active: true,
      is_hidden: false,
      description: "",
    });
    setEditingCommand(null);
    setShowForm(false);
  }

  function handleEdit(command: WhatsAppCommand) {
    setFormData({
      command_key: command.command_key,
      command_trigger: command.command_trigger,
      response_message: command.response_message,
      is_active: command.is_active,
      is_hidden: command.is_hidden,
      description: command.description || "",
    });
    setEditingCommand(command);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      if (editingCommand) {
        await updateCommand(editingCommand.id, formData);
        toast({
          title: "Success",
          description: "Command updated successfully",
        });
      } else {
        await createCommand(formData);
        toast({
          title: "Success",
          description: "Command created successfully",
        });
      }
      await loadCommands();
      resetForm();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${editingCommand ? "update" : "create"} command`,
        variant: "destructive",
      });
    }
  }

  async function handleToggleStatus(command: WhatsAppCommand) {
    try {
      await toggleCommandStatus(command.id, !command.is_active);
      toast({
        title: "Success",
        description: `Command ${!command.is_active ? "activated" : "deactivated"}`,
      });
      await loadCommands();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to toggle command status",
        variant: "destructive",
      });
    }
  }

  function confirmDelete(command: WhatsAppCommand) {
    setCommandToDelete(command);
    setDeleteDialogOpen(true);
  }

  async function handleDelete() {
    if (!commandToDelete) return;

    try {
      await deleteCommand(commandToDelete.id);
      toast({
        title: "Success",
        description: "Command deleted successfully",
      });
      await loadCommands();
      setDeleteDialogOpen(false);
      setCommandToDelete(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete command",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>WhatsApp Bot Commands</CardTitle>
              <CardDescription>
                Manage custom WhatsApp bot commands. System commands (#join, #cancel, #blok, etc.) cannot be modified.
              </CardDescription>
            </div>
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Command
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showForm && (
            <form onSubmit={handleSubmit} className="space-y-4 mb-6 p-4 border rounded-lg bg-muted/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="command_key">Command Key</Label>
                  <Input
                    id="command_key"
                    value={formData.command_key}
                    onChange={(e) => setFormData({ ...formData, command_key: e.target.value })}
                    placeholder="e.g., greeting"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="command_trigger">Trigger (with #)</Label>
                  <Input
                    id="command_trigger"
                    value={formData.command_trigger}
                    onChange={(e) => setFormData({ ...formData, command_trigger: e.target.value })}
                    placeholder="e.g., #hello"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="response_message">Response Message</Label>
                <Textarea
                  id="response_message"
                  value={formData.response_message}
                  onChange={(e) => setFormData({ ...formData, response_message: e.target.value })}
                  placeholder="Enter the bot response message"
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Internal note about this command"
                />
              </div>

              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_hidden"
                    checked={formData.is_hidden}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_hidden: checked })}
                  />
                  <Label htmlFor="is_hidden">Hidden from #help</Label>
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit">
                  {editingCommand ? "Update Command" : "Create Command"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="text-center py-8">Loading commands...</div>
          ) : commands.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No custom commands yet. Click "Add Command" to create one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Response Preview</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commands.map((command) => (
                  <TableRow key={command.id}>
                    <TableCell className="font-mono">{command.command_trigger}</TableCell>
                    <TableCell>{command.command_key}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {command.response_message.substring(0, 50)}
                      {command.response_message.length > 50 ? "..." : ""}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Badge variant={command.is_active ? "default" : "secondary"}>
                          {command.is_active ? "Active" : "Inactive"}
                        </Badge>
                        {command.is_hidden && (
                          <Badge variant="outline">
                            <EyeOff className="h-3 w-3 mr-1" />
                            Hidden
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleStatus(command)}
                        >
                          {command.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(command)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => confirmDelete(command)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Command</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the command{" "}
              <span className="font-mono font-semibold">{commandToDelete?.command_trigger}</span>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}