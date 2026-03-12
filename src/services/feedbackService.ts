import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type FeedbackCategory = "cadangan" | "ralat_sistem" | "pertanyaan_lain";
export type FeedbackStatus = "pending" | "read" | "resolved";

export interface FeedbackSubmission {
  category: FeedbackCategory;
  subject: string;
  message: string;
  screenshot_url?: string;
}

export interface FeedbackWithMember extends Tables<"member_feedback"> {
  members: {
    id: string;
    full_name: string;
    username: string;
    avatar_url: string | null;
    email: string | null;
    phone: string;
  };
}

/**
 * Submit new feedback
 */
export async function submitFeedback(
  memberId: string,
  feedback: FeedbackSubmission
) {
  const { data, error } = await supabase
    .from("member_feedback")
    .insert({
      member_id: memberId,
      category: feedback.category,
      subject: feedback.subject,
      message: feedback.message,
      screenshot_url: feedback.screenshot_url,
    })
    .select()
    .single();

  console.log("Submit feedback:", { data, error });
  if (error) throw error;
  return data;
}

/**
 * Get all feedback for current member
 */
export async function getMemberFeedback(memberId: string) {
  const { data, error } = await supabase
    .from("member_feedback")
    .select("*")
    .eq("member_id", memberId)
    .order("created_at", { ascending: false });

  console.log("Get member feedback:", { data, error });
  if (error) throw error;
  return data || [];
}

/**
 * Get all feedback (admin only)
 */
export async function getAllFeedback(): Promise<FeedbackWithMember[]> {
  const { data, error } = await supabase
    .from("member_feedback")
    .select(`
      *,
      members!member_feedback_member_id_fkey (
        id,
        full_name,
        username,
        avatar_url,
        email,
        phone
      )
    `)
    .order("created_at", { ascending: false });

  console.log("Get all feedback:", { data, error });
  if (error) throw error;
  return (data as FeedbackWithMember[]) || [];
}

/**
 * Update feedback status (admin only)
 */
export async function updateFeedbackStatus(
  feedbackId: string,
  status: FeedbackStatus
) {
  const { data, error } = await supabase
    .from("member_feedback")
    .update({ status })
    .eq("id", feedbackId)
    .select()
    .single();

  console.log("Update feedback status:", { data, error });
  if (error) throw error;
  return data;
}

/**
 * Add admin reply to feedback
 */
export async function replyToFeedback(
  feedbackId: string,
  reply: string,
  adminUserId: string
) {
  const { data, error } = await supabase
    .from("member_feedback")
    .update({
      admin_reply: reply,
      replied_at: new Date().toISOString(),
      replied_by: adminUserId,
      status: "resolved",
    })
    .eq("id", feedbackId)
    .select()
    .single();

  console.log("Reply to feedback:", { data, error });
  if (error) throw error;
  return data;
}

/**
 * Get feedback statistics (admin)
 */
export async function getFeedbackStats() {
  const { data, error } = await supabase
    .from("member_feedback")
    .select("status, category");

  console.log("Get feedback stats:", { data, error });
  if (error) throw error;

  const stats = {
    total: data?.length || 0,
    pending: data?.filter((f) => f.status === "pending").length || 0,
    read: data?.filter((f) => f.status === "read").length || 0,
    resolved: data?.filter((f) => f.status === "resolved").length || 0,
    by_category: {
      cadangan: data?.filter((f) => f.category === "cadangan").length || 0,
      ralat_sistem: data?.filter((f) => f.category === "ralat_sistem").length || 0,
      pertanyaan_lain: data?.filter((f) => f.category === "pertanyaan_lain").length || 0,
    },
  };

  return stats;
}