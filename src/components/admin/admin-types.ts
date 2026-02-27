export interface UserStats {
  totalUsers: number;
  adminCount: number;
  disabledCount: number;
  newThisWeek: number;
}

export interface AdminUser {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  disabled: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
  subscriptionTier: string;
  subscriptionStatus: string;
  trialEndsAt: string | null;
  _count: {
    quotes: number;
    jobs: number;
    printers: number;
    materials: number;
  };
}

export interface WaitlistEntry {
  id: string;
  name: string;
  email: string;
  businessName: string | null;
  status: string;
  createdAt: string;
  approvedAt: string | null;
  approvedBy: string | null;
}

export interface AnalyticsData {
  overview: {
    totalUsers: number;
    newUsersThisWeek: number;
    quotesThisMonth: number;
    conversionRate: number;
    activeJobs: number;
    pendingRequests: number;
  };
  charts: {
    dailySignups: { date: string; count: number }[];
    dailyQuotes: { date: string; draft: number; sent: number; accepted: number; other: number }[];
    weeklyRevenue: { week: string; revenue: number }[];
  };
  topUsers: {
    id: string;
    name: string | null;
    email: string | null;
    lastLogin: string | null;
    quotesCount: number;
    jobsCount: number;
    storage: { totalBytes: number; fileCount: number };
  }[];
  system: {
    tableCounts: {
      users: number;
      quotes: number;
      jobs: number;
      materials: number;
      printers: number;
      clients: number;
      invoices: number;
    };
    uploadsDirSizeBytes: number;
  };
  recentLogs: {
    id: string;
    type: string;
    level: string;
    message: string;
    createdAt: string;
  }[];
}
