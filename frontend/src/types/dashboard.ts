export type ChartPoint = {
  label: string;
  value: number;
};

export type DashboardPeriod = 7 | 15 | 30;

export type ChartSeriesByPeriod = Record<DashboardPeriod, ChartPoint[]>;

export type DashboardProperty = {
  id: string;
  name: string;
  description: string;
  status: boolean | 'unknown';
  accesses: ChartPoint[];
  accessesLast30: number;
  orders?: number[] | null;
  cycleAccesses: number | null;
  cycleOrders: number | null;
};

export type DashboardAnalyticsChannel = {
  id: string;
  name: string;
  description: string;
  sessionsLast7Days: number;
  sessionsCycle: number | null;
  accesses: ChartPoint[];
};

export type DashboardCatalog = {
  id: string;
  name: string;
  ordersCycle: number | null;
  ordersByDay: number[] | null;
};

export type DashboardData = {
  updatedAt: string;
  stale?: boolean;
  labels: string[];
  analytics: {
    channels: DashboardAnalyticsChannel[];
  };
  education: {
    lms: {
      name: string;
      loginsLast7Days: number;
      loginsByDay: ChartPoint[];
    } | null;
  };
  commerce: {
    catalogs: DashboardCatalog[];
  };
  availability: {
    monitored: number;
    online: number;
    offline: number;
    unknown: number;
    items: Array<{ id: string; name: string; status: boolean | 'unknown' }>;
    lastSuccessAt: string | null;
    lastError: string | null;
  };
};

export type CatalogData = {
  updatedAt: string;
  stale?: boolean;
  days: number;
  labels: string[];
  properties: DashboardProperty[];
};

export type PlatformData = {
  updatedAt: string;
  stale?: boolean;
  site: {
    name: string;
    status: boolean | 'unknown';
    accesses: ChartPoint[];
    accessesByPeriod: ChartSeriesByPeriod;
    totalAccesses: number;
  };
  lms: {
    name: string;
    status: boolean | 'unknown';
    accesses: ChartPoint[];
    accessesByPeriod: ChartSeriesByPeriod;
    totalAccesses: number;
    totalUsers: number;
    connectedUsers: number;
    accessesToday: number;
    registrations: number;
  };
};

export type LmsInstitution = {
  name: string;
  accessesToday: number;
  students: number;
  activeCourses: number;
  completions: number;
  accesses: ChartPoint[];
};
