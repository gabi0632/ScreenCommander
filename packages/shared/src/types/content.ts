import type { ContentType } from '../enums/content-type';
import type { TransitionType } from '../enums/transition-type';

export interface Content {
  id: string;
  type: ContentType;
  url: string;
  title: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface ContentAssignment {
  contentType: ContentType;
  url: string;
  transition: TransitionType;
  transitionDurationMs: number;
}
