
import { UserRole } from './types';

export const SCHOOL_LOCATIONS = [
  "Darshan Academy, Delhi", "Darshan Academy, Meerut", "Darshan Academy, Pune", 
  "Darshan Academy, Ludhiana", "Darshan Academy, Jalandhar", "Darshan Academy, Ambala",
  "Darshan Academy, Hisar", "Darshan Academy, Kaithal", "Darshan Academy, Kalka",
  "Darshan Academy, Dasuya", "Darshan Academy, Ferozepur", "Darshan Academy, Kotkapura",
  "Darshan Academy, Malout", "Darshan Academy, Sundargarh", "Darshan Academy, Bhubaneswar",
  "Darshan Academy, Lucknow", "Darshan Academy, Rath", "Darshan Academy, Pratapgarh",
  "Darshan Academy, Gulabpura", "Darshan Academy, Jaipur", "Darshan Academy, Jodhpur",
  "Darshan Academy, Surat", "Darshan Academy, Devlali"
];

export const AVAILABLE_ROLES = [
  { value: UserRole.TEACHER, label: "Teacher" },
  { value: UserRole.ACCOUNTANT, label: "Accountant" },
  { value: UserRole.CLEANING_STAFF, label: "Cleaning Staff" },
  { value: UserRole.SECURITY, label: "Security" },
  { value: UserRole.PRINCIPAL, label: "Principal" },
  { value: UserRole.ADMIN, label: "Administrator" },
  { value: UserRole.OTHER, label: "Other Staff" },
];
