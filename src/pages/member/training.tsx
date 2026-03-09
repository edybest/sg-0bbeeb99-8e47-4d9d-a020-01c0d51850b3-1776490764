import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SEO } from "@/components/SEO";
import { ClubLogo } from "@/components/ClubLogo";
import { MobileNav } from "@/components/member/MobileNav";
import {
  Trophy,
  Target,
  Plus,
  Edit,
  Trash2,
  History,
  Loader2,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  TrendingUp,
  Award,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import {
  getMyTrainingScores,
  createTrainingScore,
  updateTrainingScore,
  deleteTrainingScore,
} from "@/services/trainingService";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useToast } from "@/hooks/use-toast";

type Roll = string | null;

interface FrameData {
  roll1: Roll;
  roll2: Roll;
  roll3?: Roll;
  split?: boolean;
}

type TrainingScoreWithDate = any;

export default function TrainingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { member, isAuthenticated, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<TrainingScoreWithDate[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingScore, setEditingScore] = useState<TrainingScoreWithDate | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [currentRoll, setCurrentRoll] = useState(1);
  const [memberId, setMemberId] = useState<string>("");

  // Form state
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [frames, setFrames] = useState<FrameData[]>(
    Array(10).fill(null).map(() => ({ roll1: null, roll2: null, split: false }))
  );

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Calculate pagination
  const totalPages = Math.ceil(scores.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedScores = scores.slice(startIndex, endIndex);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || !member) {
        router.push("/login");
      } else {
        setMemberId(member.id);
        fetchScores();
      }
    }
  }, [authLoading, isAuthenticated, member, router]);

  async function fetchScores() {
    setLoading(true);
    await loadScores();
    setLoading(false);
  }

  async function loadScores() {
    try {
      const data = await getMyTrainingScores();
      setScores(data);
      setCurrentPage(1);
    } catch (error) {
      console.error("Error loading scores:", error);
    }
  }

  function handlePinInput(value: string) {
    const newFrames = [...frames];
    const frame = newFrames[currentFrame];

    if (currentRoll === 1) {
      frame.roll1 = value;
      
      // Auto advance to roll 2, unless strike (except frame 10)
      if (value === "X" && currentFrame < 9) {
        frame.roll2 = null;
        if (currentFrame < 9) {
          setCurrentFrame(currentFrame + 1);
          setCurrentRoll(1);
        }
      } else {
        setCurrentRoll(2);
      }
    } else if (currentRoll === 2) {
      frame.roll2 = value;
      
      // Auto advance to next frame (or roll 3 for frame 10)
      if (currentFrame === 9 && (frame.roll1 === "X" || value === "/")) {
        setCurrentRoll(3);
      } else if (currentFrame < 9) {
        setCurrentFrame(currentFrame + 1);
        setCurrentRoll(1);
      }
    } else if (currentRoll === 3 && currentFrame === 9) {
      frame.roll3 = value;
    }

    setFrames(newFrames);
  }

  function toggleSplit() {
    if (currentRoll === 1) {
      const newFrames = [...frames];
      newFrames[currentFrame].split = !newFrames[currentFrame].split;
      setFrames(newFrames);
    }
  }

  function clearCurrentFrame() {
    const newFrames = [...frames];
    newFrames[currentFrame] = {
      roll1: null,
      roll2: null,
      roll3: currentFrame === 9 ? null : undefined,
      split: false,
    };
    setFrames(newFrames);
    setCurrentRoll(1);
  }

  function clearAllFrames() {
    setFrames(Array(10).fill(null).map(() => ({ roll1: null, roll2: null, split: false })));
    setCurrentFrame(0);
    setCurrentRoll(1);
  }

  function calculateBowlingScore(frameData: FrameData[]): number {
    let total = 0;
    
    for (let i = 0; i < 10; i++) {
      const frame = frameData[i];
      if (!frame.roll1) continue;

      if (i < 9) {
        // Frames 1-9
        if (frame.roll1 === "X") {
          // Strike
          total += 10;
          const nextFrame = frameData[i + 1];
          if (nextFrame?.roll1 === "X") {
            total += 10;
            if (i < 8) {
              const nextNextFrame = frameData[i + 2];
              total += nextNextFrame?.roll1 === "X" ? 10 : parseInt(nextNextFrame?.roll1 || "0");
            } else {
              total += nextFrame.roll2 === "X" ? 10 : parseInt(nextFrame.roll2 || "0");
            }
          } else {
            total += parseInt(nextFrame?.roll1 || "0");
            if (nextFrame?.roll2 === "/") {
              total += 10 - parseInt(nextFrame.roll1 || "0");
            } else {
              total += parseInt(nextFrame?.roll2 || "0");
            }
          }
        } else if (frame.roll2 === "/") {
          // Spare
          total += 10;
          const nextFrame = frameData[i + 1];
          total += nextFrame?.roll1 === "X" ? 10 : parseInt(nextFrame?.roll1 || "0");
        } else {
          // Normal
          total += parseInt(frame.roll1 === "-" ? "0" : frame.roll1 || "0");
          total += parseInt(frame.roll2 === "-" ? "0" : frame.roll2 || "0");
        }
      } else {
        // Frame 10
        total += frame.roll1 === "X" ? 10 : parseInt(frame.roll1 === "-" ? "0" : frame.roll1 || "0");
        if (frame.roll2 === "/") {
          total += 10 - (frame.roll1 === "X" ? 0 : parseInt(frame.roll1 || "0"));
        } else {
          total += frame.roll2 === "X" ? 10 : parseInt(frame.roll2 === "-" ? "0" : frame.roll2 || "0");
        }
        if (frame.roll3) {
          total += frame.roll3 === "X" ? 10 : parseInt(frame.roll3 === "-" ? "0" : frame.roll3 || "0");
        }
      }
    }
    
    return total;
  }

  async function handleSave() {
    try {
      const totalScore = calculateBowlingScore(frames);
      
      const scoreData = {
        member_id: memberId,
        training_date: date,
        location: location || null,
        notes: notes || null,
        total_score: totalScore,
        frame1_roll1: frames[0]?.roll1,
        frame1_roll2: frames[0]?.roll2,
        frame1_split: frames[0]?.split || false,
        frame2_roll1: frames[1]?.roll1,
        frame2_roll2: frames[1]?.roll2,
        frame2_split: frames[1]?.split || false,
        frame3_roll1: frames[2]?.roll1,
        frame3_roll2: frames[2]?.roll2,
        frame3_split: frames[2]?.split || false,
        frame4_roll1: frames[3]?.roll1,
        frame4_roll2: frames[3]?.roll2,
        frame4_split: frames[3]?.split || false,
        frame5_roll1: frames[4]?.roll1,
        frame5_roll2: frames[4]?.roll2,
        frame5_split: frames[4]?.split || false,
        frame6_roll1: frames[5]?.roll1,
        frame6_roll2: frames[5]?.roll2,
        frame6_split: frames[5]?.split || false,
        frame7_roll1: frames[6]?.roll1,
        frame7_roll2: frames[6]?.roll2,
        frame7_split: frames[6]?.split || false,
        frame8_roll1: frames[7]?.roll1,
        frame8_roll2: frames[7]?.roll2,
        frame8_split: frames[7]?.split || false,
        frame9_roll1: frames[8]?.roll1,
        frame9_roll2: frames[8]?.roll2,
        frame9_split: frames[8]?.split || false,
        frame10_roll1: frames[9]?.roll1,
        frame10_roll2: frames[9]?.roll2,
        frame10_roll3: frames[9]?.roll3,
        frame10_split: frames[9]?.split || false,
      };

      if (editingScore) {
        await updateTrainingScore(editingScore.id, scoreData);
        toast({
          title: "✅ Score Updated!",
          description: `Total: ${totalScore} - Changes saved successfully`,
          duration: 3000,
        });
      } else {
        await createTrainingScore(scoreData);
        toast({
          title: "✅ Score Saved!",
          description: `Total: ${totalScore} - Successfully saved to your training history`,
          duration: 3000,
        });
      }

      await loadScores();
      handleCloseDialog();
    } catch (error) {
      console.error("Error saving score:", error);
      toast({
        title: "❌ Error",
        description: "Failed to save score. Please try again.",
        variant: "destructive",
      });
    }
  }

  function handleEdit(score: any) {
    setEditingScore(score);
    setDate(score.training_date);
    setLocation(score.location || "");
    setNotes(score.notes || "");
    
    const frameData: FrameData[] = [];
    for (let i = 1; i <= 10; i++) {
      frameData.push({
        roll1: score[`frame${i}_roll1`],
        roll2: score[`frame${i}_roll2`],
        roll3: i === 10 ? score.frame10_roll3 : undefined,
        split: score[`frame${i}_split`] || false,
      });
    }
    
    setFrames(frameData);
    setCurrentFrame(0);
    setCurrentRoll(1);
    setIsDialogOpen(true);
  }

  async function handleDelete(id: string) {
    if (confirm("Delete this training score?")) {
      try {
        await deleteTrainingScore(id);
        toast({
          title: "🗑️ Score Deleted",
          description: "Training score removed from history",
          duration: 3000,
        });
        await loadScores();
      } catch (error) {
        console.error("Error deleting score:", error);
      }
    }
  }

  function handleCloseDialog() {
    setIsDialogOpen(false);
    setEditingScore(null);
    setDate(new Date().toISOString().split("T")[0]);
    setLocation("");
    setNotes("");
    setFrames(Array(10).fill(null).map(() => ({ roll1: null, roll2: null, split: false })));
    setCurrentFrame(0);
    setCurrentRoll(1);
  }

  const getAvailablePins = (): string[] => {
    const frame = frames[currentFrame];
    const roll1Value = frame.roll1;

    // Roll 1 or Frame 10 roll 1/3 (simplified for frame 10 flexibility)
    if (currentRoll === 1 || (currentFrame === 9 && currentRoll === 3 && frame.roll2 === "X")) {
      return ["X", "/", "-", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
    }

    // Roll 2 validation based on roll 1
    if (currentRoll === 2 && roll1Value) {
      if (roll1Value === "X") {
        // After strike in frame 10
        return ["X", "-", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
      }

      const roll1Pins = roll1Value === "-" ? 0 : parseInt(roll1Value);
      
      if (isNaN(roll1Pins)) {
        return ["/", "-", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
      }

      // Calculate remaining pins
      const remainingPins = 10 - roll1Pins;
      const availablePins = ["/", "-"]; // Always allow spare and miss

      // Add valid pin counts (0 to remaining)
      for (let i = 0; i < remainingPins; i++) {
        availablePins.push(i.toString());
      }

      return availablePins;
    }
    
    // Roll 3 validation in frame 10
    if (currentRoll === 3 && currentFrame === 9) {
      if (frame.roll2 === "/") {
        return ["X", "-", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
      }
      if (frame.roll1 === "X" && frame.roll2 && frame.roll2 !== "X") {
        const roll2Pins = frame.roll2 === "-" ? 0 : parseInt(frame.roll2);
        if (!isNaN(roll2Pins)) {
           const remainingPins = 10 - roll2Pins;
           const availablePins = ["/", "-"];
           for (let i = 0; i < remainingPins; i++) {
             availablePins.push(i.toString());
           }
           return availablePins;
        }
      }
      return ["X", "-", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
    }

    // Default: all options
    return ["X", "/", "-", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
  };

  const avgScore = scores.length > 0
    ? Math.round(scores.reduce((sum, s) => sum + s.total_score, 0) / scores.length)
    : 0;
  const highScore = scores.length > 0
    ? Math.max(...scores.map(s => s.total_score))
    : 0;

  const chartData = [...scores]
    .sort((a, b) => new Date(a.training_date).getTime() - new Date(b.training_date).getTime())
    .slice(-10)
    .map((score, index) => ({
      game: `${index + 1}`,
      score: score.total_score,
    }));

  const pinButtons = [
    { value: "X", label: "X", color: "bg-yellow-500 hover:bg-yellow-600" },
    { value: "/", label: "/", color: "bg-blue-500 hover:bg-blue-600" },
    { value: "-", label: "-", color: "bg-gray-400 hover:bg-gray-500" },
    { value: "0", label: "0", color: "bg-red-500 hover:bg-red-600" },
    { value: "1", label: "1", color: "bg-orange-500 hover:bg-orange-600" },
    { value: "2", label: "2", color: "bg-amber-500 hover:bg-amber-600" },
    { value: "3", label: "3", color: "bg-yellow-500 hover:bg-yellow-600" },
    { value: "4", label: "4", color: "bg-lime-500 hover:bg-lime-600" },
    { value: "5", label: "5", color: "bg-green-500 hover:bg-green-600" },
    { value: "6", label: "6", color: "bg-emerald-500 hover:bg-emerald-600" },
    { value: "7", label: "7", color: "bg-teal-500 hover:bg-teal-600" },
    { value: "8", label: "8", color: "bg-cyan-500 hover:bg-cyan-600" },
    { value: "9", label: "9", color: "bg-sky-500 hover:bg-sky-600" },
  ];

  const availablePinValues = getAvailablePins();
  const availablePinButtons = pinButtons.filter(btn => availablePinValues.includes(btn.value));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-12 w-12 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <>
      <SEO 
        title="Training - AMBC Club"
        description="Record bowling practice scores"
      />
      <div className="min-h-screen bg-gray-50 pb-20 md:pb-8">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/member">
                  <Button variant="ghost" size="icon">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <MobileNav />
                <ClubLogo size="sm" />
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-red-600">Training</h1>
                  <p className="text-xs md:text-sm text-gray-600">Practice Scores</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-6 max-w-7xl">
          {/* Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs md:text-sm font-medium text-gray-600 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Total Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl md:text-3xl font-bold text-red-600">{scores.length}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs md:text-sm font-medium text-gray-600 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Average
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl md:text-3xl font-bold text-blue-600">{avgScore}</p>
              </CardContent>
            </Card>

            <Card className="col-span-2 md:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs md:text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Highest
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl md:text-3xl font-bold text-yellow-600">{highScore}</p>
              </CardContent>
            </Card>
          </div>

          {/* Progress Chart */}
          {scores.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-base md:text-lg">Progress Chart</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 md:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="game" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="score" stroke="#dc2626" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Add Score Button */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full mb-6 bg-red-600 hover:bg-red-700 h-12 text-base md:text-lg">
                <Plus className="mr-2 h-5 w-5" />
                Add Score
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-full md:max-w-4xl max-h-[90vh] overflow-y-auto p-4 md:p-6">
              <DialogHeader>
                <DialogTitle className="text-lg md:text-xl">
                  {editingScore ? "Edit" : "Add"} Training Score
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Date & Location */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Date
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      placeholder="e.g., Daiman Bowl"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Bowling Scorecard */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base md:text-lg font-semibold">Scorecard</Label>
                    <div className="text-sm text-gray-600">
                      Frame {currentFrame + 1}, Roll {currentRoll}
                    </div>
                  </div>

                  {/* Scorecard Grid */}
                  <div className="grid grid-cols-5 md:grid-cols-10 gap-2 bg-white p-3 md:p-4 rounded-lg border-2 border-gray-200">
                    {frames.map((frame, i) => (
                      <div
                        key={i}
                        onClick={() => {
                          setCurrentFrame(i);
                          setCurrentRoll(1);
                        }}
                        className={`relative border-2 rounded-md p-2 cursor-pointer transition-colors ${
                          i === currentFrame ? "border-red-600 bg-red-50" : "border-gray-300 hover:border-gray-400"
                        }`}
                      >
                        <div className="text-[10px] md:text-xs font-bold text-center text-gray-600 mb-1">
                          {i + 1}
                        </div>
                        <div className="grid grid-cols-2 gap-1">
                          <div className="h-8 md:h-10 flex items-center justify-center border border-gray-200 rounded text-sm md:text-base font-bold bg-white relative">
                            {frame.roll1 || ""}
                            {frame.split && (
                              <span className="absolute top-0 right-0 text-[10px] text-orange-600 font-black">⊗</span>
                            )}
                          </div>
                          <div className="h-8 md:h-10 flex items-center justify-center border border-gray-200 rounded text-sm md:text-base font-bold bg-white">
                            {frame.roll2 || ""}
                          </div>
                          {i === 9 && (
                            <div className="col-span-2 h-8 md:h-10 flex items-center justify-center border border-gray-200 rounded text-sm md:text-base font-bold bg-white mt-1">
                              {frame.roll3 || ""}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pin Input Buttons */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
                      {availablePinButtons.map((pin) => (
                        <Button
                          key={pin.value}
                          onClick={() => handlePinInput(pin.value)}
                          className={`${pin.color} text-white font-bold text-xl h-[12vh] sm:h-24 rounded-lg shadow-lg transition-all duration-150 active:scale-95 transform hover:shadow-xl`}
                        >
                          {pin.label}
                        </Button>
                      ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-3">
                      <Button
                        onClick={clearCurrentFrame}
                        variant="outline"
                        className="border-2 border-orange-500 text-orange-600 hover:bg-orange-50 font-semibold transition-all duration-150 active:scale-95 transform"
                      >
                        Clear Frame
                      </Button>
                      
                      <Button
                        onClick={clearAllFrames}
                        variant="outline"
                        className="border-2 border-red-500 text-red-600 hover:bg-red-50 font-semibold transition-all duration-150 active:scale-95 transform"
                      >
                        Clear All
                      </Button>

                      <Button
                        onClick={toggleSplit}
                        variant="outline"
                        className={`border-2 font-semibold transition-all duration-150 active:scale-95 transform ${
                          frames[currentFrame]?.split 
                            ? "border-orange-500 bg-orange-100 text-orange-700 hover:bg-orange-200" 
                            : "border-gray-300 text-gray-600 hover:bg-gray-50"
                        }`}
                        disabled={currentRoll !== 1}
                      >
                        Split {frames[currentFrame]?.split && "⊗"}
                      </Button>
                    </div>
                  </div>

                  {/* Total Score Display */}
                  <div className="bg-red-600 text-white p-4 rounded-lg text-center mt-4">
                    <div className="text-sm md:text-base font-medium">Total Score</div>
                    <div className="text-4xl md:text-5xl font-black mt-1">{calculateBowlingScore(frames)}</div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add notes about this practice session..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-1 min-h-[80px]"
                  />
                </div>

                {/* Save Button */}
                <Button onClick={handleSave} className="w-full bg-red-600 hover:bg-red-700 h-12 text-base font-bold">
                  {editingScore ? "Update Score" : "Save Score"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Scores History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Training History
                <span className="text-sm font-normal text-gray-500">
                  ({scores.length} total scores)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Pagination Info */}
              {scores.length > 0 && (
                <div className="mb-4 flex items-center justify-between text-sm text-gray-600">
                  <span>
                    Showing {startIndex + 1}-{Math.min(endIndex, scores.length)} of {scores.length} scores
                  </span>
                  <span>
                    Page {currentPage} of {totalPages}
                  </span>
                </div>
              )}

              {paginatedScores.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Target className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No training scores yet. Add your first score!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[100px]">Date</TableHead>
                        <TableHead className="hidden md:table-cell">Location</TableHead>
                        <TableHead className="text-center">Score</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedScores.map((score) => (
                        <TableRow key={score.id}>
                          <TableCell className="font-medium">
                            {new Date(score.training_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">{score.location || "-"}</TableCell>
                          <TableCell className="text-center font-bold text-lg">{score.total_score}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleEdit(score)}
                                className="h-8 w-8"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleDelete(score.id)}
                                className="h-8 w-8 text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="transition-all active:scale-95"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      // Show first page, last page, current page, and pages around current
                      const showPage = 
                        page === 1 || 
                        page === totalPages || 
                        Math.abs(page - currentPage) <= 1;
                      
                      if (!showPage) {
                        // Show ellipsis
                        if (page === currentPage - 2 || page === currentPage + 2) {
                          return <span key={page} className="px-2 text-gray-400">...</span>;
                        }
                        return null;
                      }

                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className={`min-w-[40px] transition-all active:scale-95 ${
                            currentPage === page 
                              ? "bg-red-600 hover:bg-red-700 text-white" 
                              : ""
                          }`}
                        >
                          {page}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="transition-all active:scale-95"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}