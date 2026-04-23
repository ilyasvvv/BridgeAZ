export type AccountType = "personal" | "circle";
export type UserRole =
  | "member"
  | "circle"
  | "mentor"
  | "student"
  | "professional"
  | "staffC"
  | "staffB"
  | "adminA";

export interface ApiUser {
  _id: string;
  name: string;
  username: string;
  email: string;
  accountType: AccountType;
  userType: string;
  currentRegion?: string;
  roles: UserRole[];
  avatarUrl?: string;
  profilePictureUrl?: string;
  photoUrl?: string;
  profilePhoto?: string;
  profilePhotoUrl?: string;
  isMentor?: boolean;
  banned?: boolean;
  bio?: string;
  education?: unknown[];
  experience?: unknown[];
  socialLinks?: { linkedin?: string; github?: string; website?: string };
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiAuthor {
  _id: string;
  name: string;
  username?: string;
  avatarUrl?: string;
  photoUrl?: string;
  profilePhoto?: string;
  profilePhotoUrl?: string;
  profilePictureUrl?: string;
  currentRegion?: string;
  accountType?: AccountType;
  isMentor?: boolean;
}

export interface ApiComment {
  _id: string;
  author: ApiAuthor;
  content: string;
  createdAt: string;
}

export interface ApiPost {
  _id: string;
  author: ApiAuthor;
  content: string;
  attachmentUrl?: string;
  attachmentContentType?: string;
  attachmentKind?: "image" | "pdf" | "file";
  visibilityRegion?: string;
  likes?: string[];
  likesCount: number;
  likedByMe: boolean;
  comments?: ApiComment[];
  commentCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthResponse {
  token: string;
  user: ApiUser;
}
