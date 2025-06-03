import { User, Session } from '@supabase/supabase-js';

export interface UserProfile {
  id: string; // Corresponds to auth.users.id
  username: string | null;
  avatar_url: string | null;
  color: string | null; // User's chosen unique color
  updated_at: string | null;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  error: Error | null;
  isInitialized: boolean; // To track if the initial auth state has been loaded
}

export type AuthAction = 
  | { type: 'INITIALIZE_AUTH'; session: Session | null; user: User | null; profile: UserProfile | null } 
  | { type: 'LOGIN'; session: Session; user: User; profile: UserProfile | null }
  | { type: 'LOGOUT' }
  | { type: 'SET_PROFILE'; profile: UserProfile | null }
  | { type: 'SET_LOADING'; isLoading: boolean }
  | { type: 'SET_ERROR'; error: Error | null };

// Calendar Event Types
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_date: string; // ISO string
  end_date: string; // ISO string
  user_id?: string;
  family_id?: string;
  color?: string; // Hex color for the event
  created_at?: string;
  updated_at?: string;
}

export type CalendarView = 'day' | 'week' | 'month';

export interface CalendarState {
  events: CalendarEvent[];
  selectedDate: Date;
  currentView: CalendarView;
  isLoading: boolean;
  error: string | null;
}

export type EventFormData = Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>;

export interface EventModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (event: EventFormData) => void;
  initialDate?: Date;
  editingEvent?: CalendarEvent;
} 