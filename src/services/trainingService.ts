import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type TrainingScore = Database["public"]["Tables"]["training_scores"]["Row"];

export interface TrainingScoreWithMember extends TrainingScore {
  members?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export const getMyTrainingScores = async (): Promise<TrainingScoreWithMember[]> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const { data: memberData } = await supabase
    .from("members")
    .select("id")
    .eq("user_id", session.user.id)
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

export const createTrainingScore = async (
  scoreData: any
): Promise<TrainingScore> => {
  const { data, error } = await supabase
    .from("training_scores")
    .insert(scoreData)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateTrainingScore = async (
  id: string,
  scoreData: any
): Promise<TrainingScore> => {
  const { data, error } = await supabase
    .from("training_scores")
    .update(scoreData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteTrainingScore = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("training_scores")
    .delete()
    .eq("id", id);

  if (error) throw error;
};

export const getTrainingStatistics = async (limit: number = 20) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const { data: memberData } = await supabase
    .from("members")
    .select("id")
    .eq("user_id", session.user.id)
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