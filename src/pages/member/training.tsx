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

interface FrameScore {
  roll1: string;
  roll2: string;
  roll3?: string; // Only for frame 10
}

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
  });
  const [frames, setFrames] = useState<FrameScore[]>(
    Array(10).fill(null).map(() => ({ roll1: "", roll2: "", roll3: "" }))
  );

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

  const handleRollChange = (frameIndex: number, rollNumber: 1 | 2 | 3, value: string) => {
    const newFrames = [...frames];
    const frame = newFrames[frameIndex];
    
    // Convert input to uppercase and validate
    value = value.toUpperCase();
    
    // Only allow valid characters: 0-9, X, /, -
    if (value && !/^[0-9X/\-]$/.test(value)) return;
    
    // Update the roll
    if (rollNumber === 1) {
      frame.roll1 = value;
      // If strike in frames 1-9, clear roll2
      if (value === "X" && frameIndex < 9) {
        frame.roll2 = "";
      }
    } else if (rollNumber === 2) {
      frame.roll2 = value;
    } else if (rollNumber === 3 && frameIndex === 9) {
      frame.roll3 = value;
    }
    
    setFrames(newFrames);
  };

  const getFrameScore = (frameIndex: number): number | null => {
    const frame = frames[frameIndex];
    const roll1 = frame.roll1;
    const roll2 = frame.roll2;
    const roll3 = frame.roll3 || "";

    // Frame 10 special handling
    if (frameIndex === 9) {
      let total = 0;
      
      // First roll
      if (roll1 === "X") total += 10;
      else if (roll1 === "-") total += 0;
      else if (roll1) total += parseInt(roll1) || 0;
      
      // Second roll
      if (roll2 === "X") total += 10;
      else if (roll2 === "/") total = 10;
      else if (roll2 === "-") total += 0;
      else if (roll2) total += parseInt(roll2) || 0;
      
      // Third roll (bonus)
      if (roll3 === "X") total += 10;
      else if (roll3 === "/") total += (10 - (roll2 === "X" ? 0 : parseInt(roll2) || 0));
      else if (roll3 === "-") total += 0;
      else if (roll3) total += parseInt(roll3) || 0;
      
      return total;
    }

    // Regular frames (1-9)
    if (roll1 === "X") {
      return 10; // Strike - will need next 2 rolls for bonus
    } else if (roll2 === "/") {
      return 10; // Spare - will need next 1 roll for bonus
    } else {
      const r1 = roll1 === "-" ? 0 : (parseInt(roll1) || 0);
      const r2 = roll2 === "-" ? 0 : (parseInt(roll2) || 0);
      return r1 + r2;
    }
  };

  const calculateTotalScore = (): number => {
    let total = 0;
    
    for (let i = 0; i < 10; i++) {
      const frame = frames[i];
      const frameScore = getFrameScore(i);
      
      if (frameScore === null) continue;
      
      total += frameScore;
      
      // Add bonuses for strikes and spares (frames 1-9 only)
      if (i < 9) {
        const nextFrame = frames[i + 1];
        
        // Strike bonus: next 2 rolls
        if (frame.roll1 === "X") {
          if (nextFrame.roll1 === "X") {
            total += 10;
            // If next is also strike, get first roll of frame after
            if (i < 8) {
              const frameAfterNext = frames[i + 2];
              if (frameAfterNext.roll1 === "X") total += 10;
              else if (frameAfterNext.roll1 === "-") total += 0;
              else total += parseInt(frameAfterNext.roll1) || 0;
            } else if (i === 8) {
              // Frame 9 strike, use frame 10's second roll
              if (nextFrame.roll2 === "X") total += 10;
              else if (nextFrame.roll2 === "/") total += 10;
              else if (nextFrame.roll2 === "-") total += 0;
              else total += parseInt(nextFrame.roll2) || 0;
            }
          } else {
            // Next frame not a strike
            const r1 = nextFrame.roll1 === "-" ? 0 : (parseInt(nextFrame.roll1) || 0);
            const r2 = nextFrame.roll2 === "/" ? (10 - r1) : 
                       nextFrame.roll2 === "X" ? 10 :
                       nextFrame.roll2 === "-" ? 0 : (parseInt(nextFrame.roll2) || 0);
            total += r1 + r2;
          }
        }
        // Spare bonus: next 1 roll
        else if (frame.roll2 === "/") {
          if (nextFrame.roll1 === "X") total += 10;
          else if (nextFrame.roll1 === "-") total += 0;
          else total += parseInt(nextFrame.roll1) || 0;
        }
      }
    }
    
    return total;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const frameData: any = {};
      frames.forEach((frame, i) => {
        frameData[`frame${i + 1}_roll1`] = frame.roll1 || null;
        frameData[`frame${i + 1}_roll2`] = frame.roll2 || null;
        if (i === 9) {
          frameData[`frame10_roll3`] = frame.roll3 || null;
        }
      });

      const totalScore = calculateTotalScore();

      const scoreData = {
        training_date: formData.training_date,
        location: formData.location || null,
        notes: formData.notes || null,
        total_score: totalScore,
        ...frameData,
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
    });
    
    // Load frame data
    const loadedFrames: FrameScore[] = [];
    for (let i = 1; i <= 10; i++) {
      const roll1 = score[`frame${i}_roll1` as keyof TrainingScoreWithMember] as string || "";
      const roll2 = score[`frame${i}_roll2` as keyof TrainingScoreWithMember] as string || "";
      const roll3 = i === 10 ? (score.frame10_roll3 || "") : "";
      loadedFrames.push({ roll1, roll2, roll3 });
    }
    setFrames(loadedFrames);
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
    });
    setFrames(Array(10).fill(null).map(() => ({ roll1: "", roll2: "", roll3: "" })));
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
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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

                  {/* Bowling Scorecard */}
                  <div className="space-y-2">
                    <Label>Bowling Scorecard</Label>
                    <p className="text-xs text-muted-foreground">
                      Use: X = Strike, / = Spare, - = Miss, 0-9 = Pins
                    </p>
                    <div className="overflow-x-auto">
                      <div className="inline-flex gap-1 min-w-max">
                        {frames.map((frame, frameIndex) => (
                          <div key={frameIndex} className="flex flex-col">
                            <div className="text-xs font-semibold text-center mb-1 px-2">
                              {frameIndex + 1}
                            </div>
                            <div className={`border-2 border-gray-300 rounded ${frameIndex === 9 ? "w-32" : "w-20"}`}>
                              <div className="flex">
                                {/* Roll 1 */}
                                <div className={`${frameIndex === 9 ? "w-10" : "w-10"} relative`}>
                                  <Input
                                    type="text"
                                    maxLength={1}
                                    value={frame.roll1}
                                    onChange={(e) => handleRollChange(frameIndex, 1, e.target.value)}
                                    className="h-12 text-center font-bold text-lg border-0 focus-visible:ring-0 rounded-none"
                                    placeholder="-"
                                  />
                                  <div className="absolute bottom-0 right-0 w-full h-px bg-gray-300 rotate-45 origin-bottom-right" />
                                </div>
                                {/* Roll 2 */}
                                <div className={`${frameIndex === 9 ? "w-11" : "w-10"} border-l border-gray-300`}>
                                  <Input
                                    type="text"
                                    maxLength={1}
                                    value={frame.roll2}
                                    onChange={(e) => handleRollChange(frameIndex, 2, e.target.value)}
                                    className="h-12 text-center font-bold text-lg border-0 focus-visible:ring-0 rounded-none"
                                    placeholder="-"
                                    disabled={frame.roll1 === "X" && frameIndex < 9}
                                  />
                                </div>
                                {/* Roll 3 (Frame 10 only) */}
                                {frameIndex === 9 && (
                                  <div className="w-11 border-l border-gray-300">
                                    <Input
                                      type="text"
                                      maxLength={1}
                                      value={frame.roll3}
                                      onChange={(e) => handleRollChange(frameIndex, 3, e.target.value)}
                                      className="h-12 text-center font-bold text-lg border-0 focus-visible:ring-0 rounded-none"
                                      placeholder="-"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-primary/10 p-4 rounded-lg">
                    <p className="text-sm font-semibold">
                      Total Score: <span className="text-2xl">{calculateTotalScore()}</span>
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
                <div className="space-y-4">
                  {scores.map((score) => (
                    <div key={score.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="font-semibold">
                            {new Date(score.training_date).toLocaleDateString("en-MY")}
                          </p>
                          {score.location && (
                            <p className="text-sm text-muted-foreground">{score.location}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
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
                                  This action cannot be undone.
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
                      </div>
                      
                      {/* Scorecard Display */}
                      <div className="overflow-x-auto">
                        <div className="inline-flex gap-1">
                          {Array(10).fill(null).map((_, i) => {
                            const frameNum = i + 1;
                            const roll1 = score[`frame${frameNum}_roll1` as keyof typeof score] as string || "-";
                            const roll2 = score[`frame${frameNum}_roll2` as keyof typeof score] as string || "-";
                            const roll3 = i === 9 ? (score.frame10_roll3 || "-") : "";
                            
                            return (
                              <div key={i} className="flex flex-col items-center">
                                <div className="text-xs font-semibold mb-1">{frameNum}</div>
                                <div className={`border border-gray-300 ${i === 9 ? "w-24" : "w-16"}`}>
                                  <div className="flex">
                                    <div className={`${i === 9 ? "w-8" : "w-8"} h-10 flex items-center justify-center border-r border-gray-300 text-sm font-semibold`}>
                                      {roll1}
                                    </div>
                                    <div className={`${i === 9 ? "w-8" : "w-8"} h-10 flex items-center justify-center text-sm font-semibold ${i === 9 ? "border-r border-gray-300" : ""}`}>
                                      {roll2}
                                    </div>
                                    {i === 9 && (
                                      <div className="w-8 h-10 flex items-center justify-center text-sm font-semibold">
                                        {roll3}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      
                      <div className="mt-4 flex justify-between items-center">
                        <div className="text-2xl font-bold">
                          Total: {score.total_score}
                        </div>
                        {score.notes && (
                          <p className="text-sm text-muted-foreground max-w-md">{score.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}