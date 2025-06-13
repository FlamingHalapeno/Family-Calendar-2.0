// App-wide constants
export const APP_NAME = 'Family Calendar';
export const APP_VERSION = '2.0.0';

// API Constants
export const API_TIMEOUT = 10000; // 10 seconds
export const RETRY_ATTEMPTS = 3;

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_PREFERENCES: 'user_preferences',
  THEME: 'theme',
  LANGUAGE: 'language',
} as const;

// Theme Constants
export const COLORS = {
  primary: '#007AFF',
  secondary: '#5856D6',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  background: '#F2F2F7',
  surface: '#FFFFFF',
  text: '#000000',
  textSecondary: '#8E8E93',
  border: '#C6C6C8',
} as const;

// Layout Constants
export const LAYOUT = {
  headerHeight: 60,
  tabBarHeight: 80,
  drawerWidth: 280,
  borderRadius: 8,
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
} as const;

// Calendar Constants
export const CALENDAR = {
  views: ['day', 'week', 'month'] as const,
  defaultView: 'month' as const,
  maxEventsPerDay: 10,
  eventColors: [
    '#FF3B30', // Red
    '#FF9500', // Orange
    '#FFCC00', // Yellow
    '#34C759', // Green
    '#007AFF', // Blue
    '#5856D6', // Purple
    '#FF2D92', // Pink
  ],
} as const;

// Validation Constants
export const VALIDATION = {
  email: {
    minLength: 5,
    maxLength: 254,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  password: {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
  },
  name: {
    minLength: 1,
    maxLength: 50,
  },
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  network: 'Network error. Please check your connection.',
  unauthorized: 'You are not authorized to perform this action.',
  notFound: 'The requested resource was not found.',
  serverError: 'Server error. Please try again later.',
  validation: 'Please check your input and try again.',
  unknown: 'An unexpected error occurred.',
} as const;
