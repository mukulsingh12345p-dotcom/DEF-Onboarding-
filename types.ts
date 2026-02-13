
export enum UserRole {
  ADMIN = 'ADMIN',
  TEACHER = 'TEACHER',
  ACCOUNTANT = 'ACCOUNTANT',
  CLEANING_STAFF = 'CLEANING_STAFF',
  SECURITY = 'SECURITY',
  PRINCIPAL = 'PRINCIPAL',
  OTHER = 'OTHER'
}

export interface QuizQuestion {
  text: string;
  options: string[];
  correctAnswer: number;
}

export interface TrainingModule {
  id: string;
  title: string;
  description: string;
  role: UserRole;
  category: 'NEW' | 'REFRESHER'; // Separates Onboarding from Refresher content
  folder?: string; // Groups modules (e.g., "DEF Guidelines", "Safety", etc.)
  videoUrl: string;
  transcript: string; 
  questions: QuizQuestion[];
}

export interface UserProfile {
  id?: string; // Optional for local, required for DB
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  schoolId: string;
  joinedAt: string;
  accountType: 'NEW' | 'REFRESHER';
  adminScope?: string; 
}

export interface UserSession {
  email: string; // Added as primary key link
  name: string;
  role: UserRole;
  schoolId: string;
  accountType: 'NEW' | 'REFRESHER'; // Critical for portal routing
  adminScope?: string;
}

export interface UserProgress {
  userId: string; // This will now store the Email/Login ID
  moduleId: string;
  videoWatched: boolean;
  score: number | null; 
  passed: boolean;
  attempts: number;
}
