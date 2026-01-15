import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface LearningProgress {
  id: string;
  user_id: string;
  course_id: string;
  progress: number;
  completed_at: string | null;
  created_at: string;
}

export interface LearningStats {
  id: string;
  user_id: string;
  xp: number;
  level: number;
  streak_days: number;
  last_activity_date: string | null;
  certificates_earned: string[];
  created_at: string;
}

export const useLearning = () => {
  const { user } = useAuth();
  const [progress, setProgress] = useState<LearningProgress[]>([]);
  const [stats, setStats] = useState<LearningStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Calculate level from XP
  const calculateLevel = (xp: number): number => {
    // Level formula: level = floor(sqrt(xp / 100)) + 1
    return Math.floor(Math.sqrt(xp / 100)) + 1;
  };

  // Fetch learning stats
  const fetchStats = useCallback(async () => {
    if (!user) {
      setStats(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_learning_stats")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setStats({
          ...data,
          certificates_earned: data.certificates_earned || [],
        });
      } else {
        // Create new stats for user
        const newStats = await createStats();
        if (newStats) setStats(newStats);
      }
    } catch (error) {
      console.error("Error fetching learning stats:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch course progress
  const fetchProgress = useCallback(async () => {
    if (!user) {
      setProgress([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("learning_progress")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      setProgress(data || []);
    } catch (error) {
      console.error("Error fetching progress:", error);
    }
  }, [user]);

  // Create initial stats
  const createStats = async (): Promise<LearningStats | null> => {
    if (!user) return null;

    try {
      const newStatsData = {
        user_id: user.id,
        xp: 0,
        level: 1,
        streak_days: 0,
        last_activity_date: null,
        certificates_earned: [],
      };

      const { data, error } = await supabase
        .from("user_learning_stats")
        .insert(newStatsData)
        .select()
        .single();

      if (error) throw error;

      return {
        ...data,
        certificates_earned: data.certificates_earned || [],
      };
    } catch (error) {
      console.error("Error creating stats:", error);
      return null;
    }
  };

  // Update course progress
  const updateCourseProgress = async (courseId: string, newProgress: number): Promise<boolean> => {
    if (!user) return false;

    setUpdating(true);
    try {
      const existingProgress = progress.find(p => p.course_id === courseId);
      const completed_at = newProgress >= 100 ? new Date().toISOString() : null;

      if (existingProgress) {
        const { error } = await supabase
          .from("learning_progress")
          .update({ progress: newProgress, completed_at })
          .eq("id", existingProgress.id)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("learning_progress")
          .insert({
            user_id: user.id,
            course_id: courseId,
            progress: newProgress,
            completed_at,
          });

        if (error) throw error;
      }

      await fetchProgress();

      if (newProgress >= 100) {
        toast({
          title: "🎉 Hoàn thành khóa học!",
          description: "Bạn đã hoàn thành khóa học này",
        });
        // Award XP for completing course
        await addXP(100);
      }

      return true;
    } catch (error) {
      console.error("Error updating progress:", error);
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật tiến độ",
        variant: "destructive",
      });
      return false;
    } finally {
      setUpdating(false);
    }
  };

  // Add XP and update streak
  const addXP = async (amount: number): Promise<boolean> => {
    if (!user || !stats) return false;

    setUpdating(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const lastActivity = stats.last_activity_date;
      
      // Calculate streak
      let newStreak = stats.streak_days;
      if (lastActivity) {
        const lastDate = new Date(lastActivity);
        const todayDate = new Date(today);
        const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          // Consecutive day
          newStreak += 1;
        } else if (diffDays > 1) {
          // Streak broken
          newStreak = 1;
        }
        // If same day, keep streak
      } else {
        newStreak = 1;
      }

      const newXP = stats.xp + amount;
      const newLevel = calculateLevel(newXP);

      const { error } = await supabase
        .from("user_learning_stats")
        .update({
          xp: newXP,
          level: newLevel,
          streak_days: newStreak,
          last_activity_date: today,
        })
        .eq("id", stats.id)
        .eq("user_id", user.id);

      if (error) throw error;

      setStats({
        ...stats,
        xp: newXP,
        level: newLevel,
        streak_days: newStreak,
        last_activity_date: today,
      });

      toast({
        title: `⚡ +${amount} XP`,
        description: newLevel > stats.level 
          ? `🎉 Chúc mừng! Bạn lên Level ${newLevel}!` 
          : `Tổng XP: ${newXP}`,
      });

      return true;
    } catch (error) {
      console.error("Error adding XP:", error);
      return false;
    } finally {
      setUpdating(false);
    }
  };

  // Complete a challenge
  const completeChallenge = async (challengeId: string, xpReward: number): Promise<boolean> => {
    if (!user) return false;
    
    const success = await addXP(xpReward);
    if (success) {
      toast({
        title: "🏆 Thử thách hoàn thành!",
        description: `Bạn nhận được ${xpReward} XP`,
      });
    }
    return success;
  };

  // Earn certificate
  const earnCertificate = async (certificateId: string): Promise<boolean> => {
    if (!user || !stats) return false;

    if (stats.certificates_earned.includes(certificateId)) {
      toast({
        title: "Thông báo",
        description: "Bạn đã có chứng chỉ này rồi",
      });
      return false;
    }

    setUpdating(true);
    try {
      const newCerts = [...stats.certificates_earned, certificateId];
      
      const { error } = await supabase
        .from("user_learning_stats")
        .update({ certificates_earned: newCerts })
        .eq("id", stats.id)
        .eq("user_id", user.id);

      if (error) throw error;

      setStats({ ...stats, certificates_earned: newCerts });
      toast({
        title: "🏅 Chứng chỉ mới!",
        description: "Bạn đã nhận được chứng chỉ mới",
      });
      return true;
    } catch (error) {
      console.error("Error earning certificate:", error);
      toast({
        title: "Lỗi",
        description: "Không thể cấp chứng chỉ",
        variant: "destructive",
      });
      return false;
    } finally {
      setUpdating(false);
    }
  };

  // Get progress for a specific course
  const getCourseProgress = (courseId: string): number => {
    const p = progress.find(p => p.course_id === courseId);
    return p?.progress || 0;
  };

  useEffect(() => {
    fetchStats();
    fetchProgress();
  }, [fetchStats, fetchProgress]);

  return {
    stats,
    progress,
    loading,
    updating,
    updateCourseProgress,
    addXP,
    completeChallenge,
    earnCertificate,
    getCourseProgress,
    refreshStats: fetchStats,
    refreshProgress: fetchProgress,
  };
};
