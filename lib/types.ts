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
  headline?: string;
  locationNow?: { country?: string; city?: string };
  originCountry?: string;
  profileVisibility?: "public" | "private";
  isPrivate?: boolean;
  roles: UserRole[];
  avatarUrl?: string;
  profilePictureUrl?: string;
  photoUrl?: string;
  profilePhoto?: string;
  profilePhotoUrl?: string;
  isMentor?: boolean;
  banned?: boolean;
  bio?: string;
  skills?: string[];
  links?: ApiLink[];
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
  locationNow?: { country?: string; city?: string };
  accountType?: AccountType;
  isMentor?: boolean;
}

export interface ApiLink {
  label?: string;
  type?: string;
  url: string;
}

export interface ApiCircle {
  _id: string;
  name: string;
  handle: string;
  bio?: string;
  owner?: ApiAuthor | string;
  currentRegion?: string;
  location?: { city?: string; country?: string };
  visibility?: "public" | "request" | "private";
  minAge?: boolean;
  avatarUrl?: string;
  bannerUrl?: string;
  memberCount?: number;
  postCount?: number;
  isOwner?: boolean;
  isAdmin?: boolean;
  memberRole?: "owner" | "admin" | "member";
  membershipStatus?: "none" | "pending" | "active" | "rejected";
  createdAt?: string;
  updatedAt?: string;
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
  circle?: ApiCircle;
  postedAs?: "user" | "circle";
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
