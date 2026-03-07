import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Plus, Pencil, Trash2, TrendingUp, Target, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  getMyTrainingScores,
  createTrainingScore,
  updateTrainingScore,
  deleteTrainingScore,
  getTrainingStatistics,
  type TrainingScoreWithMember,
} from "@/services/trainingService";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import Link from "next/link";

export default function TrainingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<TrainingScoreWithMember[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingScore, setEditingScore] = useState<TrainingScoreWithMember | null>(null);
  const [formData, setFormData] = useState({
    training_date: new Date().toISOString().split("T")[0],
    location: "",
    notes: "",
    frame1: "",
    frame2: "",
    frame3: "",
    frame4: "",
    frame5: "",
    frame6: "",
    frame7: "",
    frame8: "",
    frame9: "",
    frame10: "",
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      await loadData();
    } catch (error) {
      console.error("Auth check error:", error);
      router.push("/login");
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [scoresData, statsData] = await Promise.all([
        getMyTrainingScores(),
        getTrainingStatistics(20),
      ]);
      
      setScores(scoresData);
      
      const formattedChartData = statsData.map(stat => ({
        date: new Date(stat.training_date).toLocaleDateString("en-MY", { 
          day: "2-digit",
          month: "short" 
        }),
        score: stat.total_score,
      }));
      setChartData(formattedChartData);
    } catch (error: any) {
      console.error("Load data error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load training data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const scoreData = {
        training_date: formData.training_date,
        location: formData.location || null,
        notes: formData.notes || null,
        frame1: formData.frame1 ? parseInt(formData.frame1) : null,
        frame2: formData.frame2 ? parseInt(formData.frame2) : null,
        frame3: formData.frame3 ? parseInt(formData.frame3) : null,
        frame4: formData.frame4 ? parseInt(formData.frame4) : null,
        frame5: formData.frame5 ? parseInt(formData.frame5) : null,
        frame6: formData.frame6 ? parseInt(formData.frame6) : null,
        frame7: formData.frame7 ? parseInt(formData.frame7) : null,
        frame8: formData.frame8 ? parseInt(formData.frame8) : null,
        frame9: formData.frame9 ? parseInt(formData.frame9) : null,
        frame10: formData.frame10 ? parseInt(formData.frame10) : null,
      };

      if (editingScore) {
        await updateTrainingScore(editingScore.id, scoreData);
        toast({ title: "Success", description: "Training score updated successfully" });
      } else {
        await createTrainingScore(scoreData);
        toast({ title: "Success", description: "Training score added successfully" });
      }

      setIsDialogOpen(false);
      resetForm();
      await loadData();
    } catch (error: any) {
      console.error("Submit error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save training score",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (score: TrainingScoreWithMember) => {
    setEditingScore(score);
    setFormData({
      training_date: score.training_date,
      location: score.location || "",
      notes: score.notes || "",
      frame1: score.frame1?.toString() || "",
      frame2: score.frame2?.toString() || "",
      frame3: score.frame3?.toString() || "",
      frame4: score.frame4?.toString() || "",
      frame5: score.frame5?.toString() || "",
      frame6: score.frame6?.toString() || "",
      frame7: score.frame7?.toString() || "",
      frame8: score.frame8?.toString() || "",
      frame9: score.frame9?.toString() || "",
      frame10: score.frame10?.toString() || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTrainingScore(id);
      toast({ title: "Success", description: "Training score deleted successfully" });
      await loadData();
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete training score",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setEditingScore(null);
    setFormData({
      training_date: new Date().toISOString().split("T")[0],
      location: "",
      notes: "",
      frame1: "",
      frame2: "",
      frame3: "",
      frame4: "",
      frame5: "",
      frame6: "",
      frame7: "",
      frame8: "",
      frame9: "",
      frame10: "",
    });
  };

  const calculateTotal = () => {
    const frames = [
      formData.frame1, formData.frame2, formData.frame3, formData.frame4, formData.frame5,
      formData.frame6, formData.frame7, formData.frame8, formData.frame9, formData.frame10
    ];
    return frames.reduce((sum, frame) => sum + (frame ? parseInt(frame) : 0), 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const averageScore = scores.length > 0
    ? Math.round(scores.reduce((sum, s) => sum + (s.total_score || 0), 0) / scores.length)
    : 0;

  const highestScore = scores.length > 0
    ? Math.max(...scores.map(s => s.total_score || 0))
    : 0;

  return (
    <>
      <SEO title="Training - AMBC CLUB" description="Track your bowling practice scores" />
      
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Link href="/member">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold">Training</h1>
                <p className="text-muted-foreground">Track your practice sessions</p>
              </div>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Score
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingScore ? "Edit" : "Add"} Training Score</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="training_date">Date</Label>
                      <Input
                        id="training_date"
                        type="date"
                        value={formData.training_date}
                        onChange={(e) => setFormData({ ...formData, training_date: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="e.g., Megalanes"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Frame Scores (0-30 each)</Label>
                    <div className="grid grid-cols-5 gap-2 mt-2">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((frame) => (
                        <div key={frame}>
                          <Label className="text-xs">Frame {frame}</Label>
                          <Input
                            type="number"
                            min="0"
                            max="30"
                            value={formData[`frame${frame}` as keyof typeof formData]}
                            onChange={(e) => setFormData({ 
                              ...formData, 
                              [`frame${frame}`]: e.target.value 
                            })}
                            placeholder="0"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-primary/10 p-4 rounded-lg">
                    <p className="text-sm font-semibold">
                      Total Score: <span className="text-2xl">{calculateTotal()}</span>
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Add any notes about this session..."
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false);
                        resetForm();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingScore ? "Update" : "Add"} Score
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{scores.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{averageScore}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Highest Score</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{highestScore}</div>
              </CardContent>
            </Card>
          </div>

          {/* Progress Chart */}
          {chartData.length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Progress Chart</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Scores Table */}
          <Card>
            <CardHeader>
              <CardTitle>Training History</CardTitle>
            </CardHeader>
            <CardContent>
              {scores.length === 0 ? (
                <div className="text-center py-12">
                  <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Training Scores Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start tracking your practice sessions to see your progress
                  </p>
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Score
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead className="text-center">F1</TableHead>
                        <TableHead className="text-center">F2</TableHead>
                        <TableHead className="text-center">F3</TableHead>
                        <TableHead className="text-center">F4</TableHead>
                        <TableHead className="text-center">F5</TableHead>
                        <TableHead className="text-center">F6</TableHead>
                        <TableHead className="text-center">F7</TableHead>
                        <TableHead className="text-center">F8</TableHead>
                        <TableHead className="text-center">F9</TableHead>
                        <TableHead className="text-center">F10</TableHead>
                        <TableHead className="text-center font-bold">Total</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scores.map((score) => (
                        <TableRow key={score.id}>
                          <TableCell>
                            {new Date(score.training_date).toLocaleDateString("en-MY")}
                          </TableCell>
                          <TableCell>{score.location || "-"}</TableCell>
                          <TableCell className="text-center">{score.frame1 || "-"}</TableCell>
                          <TableCell className="text-center">{score.frame2 || "-"}</TableCell>
                          <TableCell className="text-center">{score.frame3 || "-"}</TableCell>
                          <TableCell className="text-center">{score.frame4 || "-"}</TableCell>
                          <TableCell className="text-center">{score.frame5 || "-"}</TableCell>
                          <TableCell className="text-center">{score.frame6 || "-"}</TableCell>
                          <TableCell className="text-center">{score.frame7 || "-"}</TableCell>
                          <TableCell className="text-center">{score.frame8 || "-"}</TableCell>
                          <TableCell className="text-center">{score.frame9 || "-"}</TableCell>
                          <TableCell className="text-center">{score.frame10 || "-"}</TableCell>
                          <TableCell className="text-center font-bold">
                            {score.total_score}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(score)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Training Score?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone. This will permanently delete this training score.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(score.id)}>
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}