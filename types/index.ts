import { User, Session } from '@supabase/supabase-js';

export interface UserProfile {
  id: string; // Corresponds to auth.users.id
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  timezone: string | null;
  created_at: string | null;
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

// Linked Calendar Types
export interface LinkedCalendar {
  id: string;
  user_id: string;
  family_id: string;
  provider: string; // 'google', 'outlook', etc.
  account_email: string;
  calendar_id: string;
  calendar_name: string | null;
  color: string;
  is_synced: boolean;
  created_at: string;
  updated_at: string;
}

export interface CalendarOption {
  id: string | null; // null for "Family Calendar"
  name: string;
  color: string;
  isDefault?: boolean; // true for "Family Calendar"
}

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
  linked_calendar_id?: string | null; // Reference to linked_calendars table
  external_event_id?: string | null; // External provider event ID
  created_at?: string;
  updated_at?: string;
}

// Extended event type for external events with metadata
export interface ExternalCalendarEvent extends CalendarEvent {
  _isExternal?: boolean;
  _source?: string; // 'google', 'outlook', etc.
  _htmlLink?: string; // Link to event in external calendar
  _readOnly?: boolean; // Whether the event can be edited
}

export type CalendarView = 'day' | 'week' | 'month';

export interface CalendarState {
  events: CalendarEvent[];
  selectedDate: Date;
  currentView: CalendarView;
  isLoading: boolean;
  error: string | null;
}

// External event query status
export interface ExternalEventStatus {
  isLoading: boolean;
  error: Error | null;
  data: CalendarEvent[] | undefined;
}

export type EventFormData = Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>;

export interface EventModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (event: EventFormData) => void;
  initialDate?: Date;
  editingEvent?: CalendarEvent;
} 