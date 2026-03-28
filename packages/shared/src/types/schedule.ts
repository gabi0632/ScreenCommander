export interface ScheduleEntry {
  id: string;
  displayId: string;
  contentId: string;
  startTime: string;
  endTime: string | null;
  recurrenceRule: string | null;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
