export type DashboardActivityLogRecord = Record<string, any> & {
  id?: string;
  action?: string;
  actorRole?: string;
  timestamp?: string;
  reason?: string;
};

export const activityLogService = {
  getLogs: (_filters?: Record<string, unknown>): DashboardActivityLogRecord[] => [],
};
