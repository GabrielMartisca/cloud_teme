import { PostComment } from './comment';
export interface Post {
    id?: number;
    user_id?: number;
    content: string;
    location?: string;
    username?: string; // For display purposes
    timestamp?: string;
    comments?: PostComment[]; // Explicitly define comments as PostComment[]
    isTranslated?: boolean;
    translatedContent?: string;
    translatedLanguage?: string;
    isTranslating?: boolean;
    showComments?: boolean;
    isEditing?: boolean;  // Add this property
    editedContent?: string;
  }