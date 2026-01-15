import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, BookOpen, Trophy, Library, Award, Flame, Star, 
  Play, CheckCircle2, Lock, ChevronRight, Zap, Loader2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useLearning } from "@/hooks/useLearning";
import BottomNav from "@/components/layout/BottomNav";

const coursesData = [
  {
    id: "blockchain-101",
    title: "Blockchain 101",
    description: "Hiểu cơ bản về công nghệ blockchain",
    lessons: 12,
    duration: "2 giờ",
    isLocked: false,
    thumbnail: "📚",
    xpReward: 100,
  },
  {
    id: "defi",
    title: "DeFi - Tài chính phi tập trung",
    description: "Khám phá thế giới DeFi",
    lessons: 15,
    duration: "3 giờ",
    isLocked: false,
    thumbnail: "💰",
    xpReward: 150,
  },
  {
    id: "nft-metaverse",
    title: "NFT & Metaverse",
    description: "Tương lai của tài sản số",
    lessons: 10,
    duration: "1.5 giờ",
    isLocked: false,
    thumbnail: "🎨",
    xpReward: 100,
  },
  {
    id: "risk-management",
    title: "Quản lý rủi ro & Tâm lý",
    description: "Trading thông minh và an toàn",
    lessons: 8,
    duration: "1 giờ",
    isLocked: true,
    thumbnail: "🧠",
    xpReward: 80,
  },
];

const challengesData = [
  {
    id: "smart-contract-quiz",
    title: "Quiz: Smart Contract",
    description: "5 câu hỏi về smart contract",
    xp: 50,
  },
  {
    id: "token-standards-quiz",
    title: "Quiz: Token Standards",
    description: "Phân biệt ERC-20, BEP-20...",
    xp: 30,
  },
  {
    id: "defi-basics",
    title: "Quiz: DeFi Basics",
    description: "Kiểm tra kiến thức DeFi",
    xp: 40,
  },
];

const certificatesData = [
  { id: "bronze", icon: "🥉", name: "Bronze Learner", requiredXP: 100 },
  { id: "silver", icon: "🥈", name: "Silver Learner", requiredXP: 500 },
  { id: "gold", icon: "🥇", name: "Gold Learner", requiredXP: 1000 },
  { id: "master", icon: "👑", name: "Master", requiredXP: 2500 },
];

const quotes = [
  "Mỗi ngày là cơ hội mới để học hỏi và phát triển",
  "Kiến thức là sức mạnh trong thế giới crypto",
  "Đầu tư vào bản thân là đầu tư thông minh nhất",
  "Hành trình nghìn dặm bắt đầu từ một bước chân",
];

const Learn = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { stats, loading, updating, updateCourseProgress, completeChallenge, earnCertificate, getCourseProgress } = useLearning();
  const [activeTab, setActiveTab] = useState("courses");
  const [dailyQuote] = useState(quotes[Math.floor(Math.random() * quotes.length)]);
  const [completedChallenges, setCompletedChallenges] = useState<string[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleContinueCourse = async (courseId: string) => {
    const currentProgress = getCourseProgress(courseId);
    // Simulate progress increase (in real app, this would be lesson completion)
    const newProgress = Math.min(100, currentProgress + 10);
    await updateCourseProgress(courseId, newProgress);
  };

  const handleStartCourse = async (courseId: string) => {
    await updateCourseProgress(courseId, 5); // Start with 5% progress
  };

  const handleCompleteChallenge = async (challengeId: string, xp: number) => {
    if (completedChallenges.includes(challengeId)) return;
    
    const success = await completeChallenge(challengeId, xp);
    if (success) {
      setCompletedChallenges([...completedChallenges, challengeId]);
    }
  };

  const handleClaimCertificate = async (certId: string) => {
    await earnCertificate(certId);
  };

  // Check if user can claim a certificate
  const canClaimCertificate = (requiredXP: number) => {
    return (stats?.xp || 0) >= requiredXP;
  };

  const hasCertificate = (certId: string) => {
    return stats?.certificates_earned?.includes(certId) || false;
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-heading font-bold">Học tập</h1>
          </div>
          <Button variant="ghost" size="icon">
            <Trophy className="w-5 h-5 text-accent" />
          </Button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-6">
        {/* Daily Quote */}
        <Card className="gradient-border overflow-hidden">
          <CardContent className="p-4">
            <p className="rainbow-text font-heading text-lg">🌈 Chào buổi sáng!</p>
            <p className="text-muted-foreground italic mt-2">"{dailyQuote}"</p>
            <p className="text-sm text-muted-foreground mt-1">── Cha Vũ Trụ ──</p>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="glass-card">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Flame className="w-4 h-4 text-destructive" />
                <span className="font-bold text-lg">{stats?.streak_days || 0}</span>
              </div>
              <p className="text-xs text-muted-foreground">Ngày streak</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Zap className="w-4 h-4 text-accent" />
                <span className="font-bold text-lg rainbow-text">{stats?.xp || 0}</span>
              </div>
              <p className="text-xs text-muted-foreground">XP</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Star className="w-4 h-4 text-primary" />
                <span className="font-bold text-lg">Lv.{stats?.level || 1}</span>
              </div>
              <p className="text-xs text-muted-foreground">Level</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="courses" className="text-xs">
              <BookOpen className="w-4 h-4 mr-1" />
              Khóa học
            </TabsTrigger>
            <TabsTrigger value="challenges" className="text-xs">
              <Trophy className="w-4 h-4 mr-1" />
              Thử thách
            </TabsTrigger>
            <TabsTrigger value="library" className="text-xs">
              <Library className="w-4 h-4 mr-1" />
              Thư viện
            </TabsTrigger>
            <TabsTrigger value="certificates" className="text-xs">
              <Award className="w-4 h-4 mr-1" />
              Chứng chỉ
            </TabsTrigger>
          </TabsList>

          {/* Courses */}
          <TabsContent value="courses" className="mt-4 space-y-3 animate-fade-in">
            <h3 className="font-semibold">Khóa học đang học</h3>
            
            {coursesData.filter(c => getCourseProgress(c.id) > 0 && getCourseProgress(c.id) < 100).map((course) => {
              const progress = getCourseProgress(course.id);
              return (
                <Card key={course.id} className="gradient-border overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-4xl">{course.thumbnail}</div>
                      <div className="flex-1">
                        <h4 className="font-semibold">{course.title}</h4>
                        <p className="text-sm text-muted-foreground">{course.lessons} bài • {course.duration}</p>
                        <div className="mt-2 space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Tiến độ</span>
                            <span className="text-primary font-medium">{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                      </div>
                    </div>
                    <Button 
                      className="w-full mt-3 bg-primary hover:bg-primary/90"
                      onClick={() => handleContinueCourse(course.id)}
                      disabled={updating}
                    >
                      {updating ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4 mr-2" />
                      )}
                      Tiếp tục học
                    </Button>
                  </CardContent>
                </Card>
              );
            })}

            {/* Completed Courses */}
            {coursesData.filter(c => getCourseProgress(c.id) >= 100).length > 0 && (
              <>
                <h3 className="font-semibold mt-6">Đã hoàn thành</h3>
                {coursesData.filter(c => getCourseProgress(c.id) >= 100).map((course) => (
                  <Card key={course.id} className="glass-card border-success/50">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="text-4xl">{course.thumbnail}</div>
                      <div className="flex-1">
                        <h4 className="font-semibold">{course.title}</h4>
                        <p className="text-sm text-success flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          Hoàn thành
                        </p>
                      </div>
                      <Badge className="bg-success/20 text-success">+{course.xpReward} XP</Badge>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}

            <h3 className="font-semibold mt-6">Khóa học gợi ý</h3>
            
            <div className="grid grid-cols-2 gap-3">
              {coursesData.filter(c => getCourseProgress(c.id) === 0).map((course) => (
                <Card 
                  key={course.id} 
                  className={`glass-card relative overflow-hidden cursor-pointer ${course.isLocked ? "opacity-70" : ""}`}
                  onClick={() => !course.isLocked && handleStartCourse(course.id)}
                >
                  <CardContent className="p-3">
                    <div className="text-3xl mb-2">{course.thumbnail}</div>
                    <h4 className="font-semibold text-sm line-clamp-2">{course.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{course.lessons} bài</p>
                    {course.isLocked && (
                      <div className="absolute top-2 right-2">
                        <Lock className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Challenges */}
          <TabsContent value="challenges" className="mt-4 space-y-3 animate-fade-in">
            <Card className="gradient-border overflow-hidden">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Flame className="w-6 h-6 text-destructive" />
                  <span className="text-2xl font-bold">{stats?.streak_days || 0} ngày</span>
                </div>
                <p className="text-sm text-muted-foreground">Streak liên tiếp</p>
                <p className="text-xs text-muted-foreground mt-1">Hoàn thành thử thách hôm nay để duy trì streak!</p>
              </CardContent>
            </Card>

            <h3 className="font-semibold">Thử thách hôm nay</h3>
            
            {challengesData.map((challenge) => {
              const isCompleted = completedChallenges.includes(challenge.id);
              return (
                <Card 
                  key={challenge.id} 
                  className={`glass-card ${isCompleted ? "border-success/50" : ""}`}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isCompleted ? "bg-success/20" : "bg-primary/20"
                    }`}>
                      {isCompleted 
                        ? <CheckCircle2 className="w-5 h-5 text-success" />
                        : <Zap className="w-5 h-5 text-primary" />
                      }
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{challenge.title}</h4>
                      <p className="text-sm text-muted-foreground">{challenge.description}</p>
                    </div>
                    {isCompleted ? (
                      <Badge className="bg-success/20 text-success">+{challenge.xp} XP</Badge>
                    ) : (
                      <Button 
                        size="sm"
                        onClick={() => handleCompleteChallenge(challenge.id, challenge.xp)}
                        disabled={updating}
                      >
                        {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : `+${challenge.xp} XP`}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            <Button 
              className="w-full bg-gradient-to-r from-primary to-secondary text-primary-foreground"
              disabled={updating}
            >
              <Trophy className="w-4 h-4 mr-2" />
              Làm thử thách mới
            </Button>
          </TabsContent>

          {/* Library */}
          <TabsContent value="library" className="mt-4 space-y-3 animate-fade-in">
            <Card className="glass-card">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-8 h-8 text-primary" />
                  <div>
                    <h4 className="font-semibold">Bài viết & Blog</h4>
                    <p className="text-sm text-muted-foreground">25 bài viết</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Play className="w-8 h-8 text-secondary" />
                  <div>
                    <h4 className="font-semibold">Video Tutorials</h4>
                    <p className="text-sm text-muted-foreground">15 video</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Library className="w-8 h-8 text-accent" />
                  <div>
                    <h4 className="font-semibold">Từ điển Crypto</h4>
                    <p className="text-sm text-muted-foreground">200+ thuật ngữ</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">🎧</div>
                  <div>
                    <h4 className="font-semibold">Podcast</h4>
                    <p className="text-sm text-muted-foreground">10 episodes</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Certificates */}
          <TabsContent value="certificates" className="mt-4 space-y-3 animate-fade-in">
            <p className="text-sm text-muted-foreground">Chứng chỉ bạn đã đạt được</p>
            
            <div className="grid grid-cols-2 gap-3">
              {certificatesData.map((cert) => {
                const earned = hasCertificate(cert.id);
                const canClaim = canClaimCertificate(cert.requiredXP) && !earned;
                
                return (
                  <Card 
                    key={cert.id} 
                    className={`glass-card text-center ${earned ? "gradient-border" : canClaim ? "border-primary/50" : "opacity-50"}`}
                  >
                    <CardContent className="p-4">
                      <div className={`text-4xl mb-2 ${!earned && !canClaim ? "grayscale" : ""}`}>
                        {cert.icon}
                      </div>
                      <h4 className="font-semibold text-sm">{cert.name}</h4>
                      <p className="text-xs text-muted-foreground">{cert.requiredXP} XP</p>
                      {earned ? (
                        <Badge className="mt-2 bg-success/20 text-success">Đã đạt</Badge>
                      ) : canClaim ? (
                        <Button 
                          size="sm" 
                          className="mt-2"
                          onClick={() => handleClaimCertificate(cert.id)}
                          disabled={updating}
                        >
                          {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Nhận ngay"}
                        </Button>
                      ) : (
                        <Badge variant="outline" className="mt-2">Chưa đủ XP</Badge>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card className="gradient-border overflow-hidden">
              <CardContent className="p-4 text-center">
                <Award className="w-12 h-12 mx-auto mb-3 text-accent" />
                <h4 className="font-semibold">Chia sẻ thành tích</h4>
                <p className="text-sm text-muted-foreground mt-1">Khoe chứng chỉ NFT của bạn trên mạng xã hội</p>
                <Button variant="outline" className="mt-3">
                  Chia sẻ LinkedIn
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
};

export default Learn;
