export interface Discussion {
  id: number;
  title: string;
  content: string;
  author_id: number;
  category_id: number | null;
  status: 'open' | 'closed' | 'locked';
  is_pinned: boolean;
  views: number;
  likes_count: number;
  replies_count: number;
  last_reply_at: Date | null;
  last_reply_user_id: number | null;
  solution_id: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface DiscussionWithRelations extends Discussion {
  author: {
    id: number;
    username: string;
    avatar: string | null;
  };
  category?: {
    id: number;
    name: string;
    slug: string;
    color: string | null;
    icon: string | null;
  };
  tags: Array<{
    id: number;
    name: string;
  }>;
  last_reply_user?: {
    id: number;
    username: string;
    avatar: string | null;
  };
  is_liked?: boolean;
  is_collected?: boolean;
}

export interface CreateDiscussionDTO {
  title: string;
  content: string;
  category_id?: number;
  tags?: string[];
  is_pinned?: boolean;
}

export interface UpdateDiscussionDTO {
  title?: string;
  content?: string;
  category_id?: number;
  tags?: string[];
  is_pinned?: boolean;
  status?: 'open' | 'closed' | 'locked';
}

export interface DiscussionReply {
  id: number;
  discussion_id: number;
  content: string;
  author_id: number;
  parent_id: number | null;
  likes_count: number;
  is_edited: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface DiscussionReplyWithRelations extends DiscussionReply {
  author: {
    id: number;
    username: string;
    avatar: string | null;
  };
  children?: DiscussionReplyWithRelations[];
  is_liked?: boolean;
}

export interface CreateReplyDTO {
  content: string;
  parent_id?: number;
}

export interface UpdateReplyDTO {
  content: string;
}

export interface DiscussionFilters {
  category_id?: number;
  author_id?: number;
  status?: 'open' | 'closed' | 'locked';
  is_pinned?: boolean;
  tag?: string;
  search?: string;
  sort?: 'latest' | 'popular' | 'unanswered';
}

export interface DiscussionDraft {
  id: number;
  title: string | null;
  content: string;
  author_id: number;
  category_id: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateDraftDTO {
  title?: string;
  content: string;
  category_id?: number;
}

export interface UpdateDraftDTO {
  title?: string;
  content?: string;
  category_id?: number;
}