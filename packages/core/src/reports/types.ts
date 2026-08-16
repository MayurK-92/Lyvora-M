export interface ReportMemoryCard {
  id: string;
  title: string;
  tldr: string | null;
  category: string;
  viewCount: number;
}

export interface WeeklyReportPayload {
  weekStart: string;
  weekEnd: string;
  timezone: string;
  savedThisWeek: number;
  savedLastWeek: number;
  savedDelta: number;
  topCategories: Array<{ category: string; count: number }>;
  emergingTags: Array<{ tag: string; count: number }>;
  mostViewed: ReportMemoryCard[];
  neverRevisitedCount: number;
  recommendedRevisits: ReportMemoryCard[];
  growth: {
    totalMemories: number;
    totalEntities: number;
    totalEdges: number;
  };
  stale: Array<{ id: string; title: string; reason: string }>;
}

export interface WeeklyReportResult {
  id: string;
  userId: string;
  weekStart: string;
  payload: WeeklyReportPayload;
  narrative: string | null;
  createdAt: Date;
}
