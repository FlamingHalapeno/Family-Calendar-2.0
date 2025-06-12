export interface FamilyMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: 'admin' | 'member';
  avatar_url?: string;
} 