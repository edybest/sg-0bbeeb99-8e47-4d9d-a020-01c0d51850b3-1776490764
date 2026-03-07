import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type TrainingScore = Database["public"]["Tables"]["training_scores"]["Row"];
type TrainingScoreInsert = Database["public"]["Tables"]["training_scores"]["Insert"];
type TrainingScoreUpdate = Database["public"]["Tables"]["training_scores"]["Update"];

export interface TrainingScoreWithMember extends TrainingScore {
  members?: {
    full_name: string;
    avatar_url: string | null;
  };
}

// Calculate total score from frames
export const calculateTotalScore = (frames: (number | null)[]): number => {
  return frames.reduce((sum, frame) => sum + (frame || 0), 0);
};

// Get all training scores for current member
export const getMyTrainingScores = async (): Promise<TrainingScoreWithMember[]> => {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) throw new Error("Not authenticated");

  const { data: memberData } = await supabase
    .from("members")
    .select("id")
    .eq("user_id", sessionData.session.user.id)
    .single();

  if (!memberData) throw new Error("Member not found");

  const { data, error } = await supabase
    .from("training_scores")
    .select(`
      *,
      members!training_scores_member_id_fkey(full_name, avatar_url)
    `)
    .eq("member_id", memberData.id)
    .order("training_date", { ascending: false });

  if (error) throw error;
  return data || [];
};

// Get training scores with pagination
export const getTrainingScoresWithPagination = async (
  page: number = 1,
  pageSize: number = 10
): Promise<{ scores: TrainingScoreWithMember[]; total: number }> => {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) throw new Error("Not authenticated");

  const { data: memberData } = await supabase
    .from("members")
    .select("id")
    .eq("user_id", sessionData.session.user.id)
    .single();

  if (!memberData) throw new Error("Member not found");

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("training_scores")
    .select(`
      *,
      members!training_scores_member_id_fkey(full_name, avatar_url)
    `, { count: "exact" })
    .eq("member_id", memberData.id)
    .order("training_date", { ascending: false })
    .range(from, to);

  if (error) throw error;
  return { scores: data || [], total: count || 0 };
};

// Create new training score
export const createTrainingScore = async (
  scoreData: Omit<TrainingScoreInsert, "member_id">
): Promise<TrainingScore> => {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) throw new Error("Not authenticated");

  const { data: memberData } = await supabase
    .from("members")
    .select("id")
    .eq("user_id", sessionData.session.user.id)
    .single();

  if (!memberData) throw new Error("Member not found");

  // Calculate total score
  const frames = [
    scoreData.frame1, scoreData.frame2, scoreData.frame3, scoreData.frame4, scoreData.frame5,
    scoreData.frame6, scoreData.frame7, scoreData.frame8, scoreData.frame9, scoreData.frame10
  ];
  const totalScore = calculateTotalScore(frames);

  const { data, error } = await supabase
    .from("training_scores")
    .insert({
      ...scoreData,
      member_id: memberData.id,
      total_score: totalScore,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Update training score
export const updateTrainingScore = async (
  id: string,
  scoreData: TrainingScoreUpdate
): Promise<TrainingScore> => {
  // Calculate total score if frames are updated
  const frames = [
    scoreData.frame1, scoreData.frame2, scoreData.frame3, scoreData.frame4, scoreData.frame5,
    scoreData.frame6, scoreData.frame7, scoreData.frame8, scoreData.frame9, scoreData.frame10
  ];
  
  const hasFrameData = frames.some(f => f !== undefined);
  const totalScore = hasFrameData ? calculateTotalScore(frames) : undefined;

  const { data, error } = await supabase
    .from("training_scores")
    .update({
      ...scoreData,
      ...(totalScore !== undefined && { total_score: totalScore }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Delete training score
export const deleteTrainingScore = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("training_scores")
    .delete()
    .eq("id", id);

  if (error) throw error;
};

// Get training statistics for charts
export const getTrainingStatistics = async (limit: number = 10) => {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) throw new Error("Not authenticated");

  const { data: memberData } = await supabase
    .from("members")
    .select("id")
    .eq("user_id", sessionData.session.user.id)
    .single();

  if (!memberData) throw new Error("Member not found");

  const { data, error } = await supabase
    .from("training_scores")
    .select("training_date, total_score")
    .eq("member_id", memberData.id)
    .order("training_date", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data || [];
};