export interface PostComment {
    id?: number;
    post_id: number;
    user_id?: number;
    content: string;
    username?: string; // For display purposes
    timestamp?: string;
    isEditing?: boolean;
    editedContent: string;
  }
  