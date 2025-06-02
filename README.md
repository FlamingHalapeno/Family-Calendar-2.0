# Family Calendar 2.0

A modern family calendar mobile app built with React Native, Expo, and Supabase.

## Features

- 🔐 **Secure Authentication** - Email/password auth with Supabase
- 📱 **Cross-Platform** - iOS, Android, and Web support
- 🔄 **Real-time Sync** - Live updates across all devices
- 📅 **Calendar Events** - Create, edit, and manage family events
- 👥 **Family Sharing** - Share calendars with family members
- 🎨 **Modern UI** - Clean, intuitive interface

## Tech Stack

- **Frontend**: React Native, Expo
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **State Management**: React Query + Context
- **Language**: TypeScript
- **Storage**: Expo SecureStore

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key from the project dashboard
3. Create a `.env` file in the root directory:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 3. Database Setup

Run these SQL commands in your Supabase SQL editor:

```sql
-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Create events table
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Create policies for events
CREATE POLICY "Users can view own events" ON events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own events" ON events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own events" ON events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own events" ON events FOR DELETE USING (auth.uid() = user_id);

-- Create function to handle user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### 4. Generate TypeScript Types (Optional)

```bash
npx supabase gen types typescript --project-id vqfvqgaazdzghpnwkmps > lib/database.types.ts
```

### 5. Run the App

```bash
npm start
```

## Project Structure

```
├── App.tsx                 # Main app component
├── lib/
│   ├── supabase.ts        # Supabase client configuration
│   └── database.types.ts  # TypeScript database types
├── providers/
│   ├── AuthProvider.tsx   # Authentication context
│   └── QueryProvider.tsx  # React Query provider
├── hooks/
│   └── useDatabase.ts     # Database operation hooks
└── components/            # Reusable UI components
```

## Environment Variables

Create a `.env` file with these variables:

```env
# Required Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional App Configuration
EXPO_PUBLIC_APP_NAME=Family Calendar
EXPO_PUBLIC_APP_VERSION=1.0.0
```

## Key Features Implementation

### Authentication
- Secure token storage with Expo SecureStore
- Auto-refresh tokens
- Auth state management with React Context

### Database Operations
- Type-safe database queries
- React Query for caching and synchronization
- Row Level Security (RLS) for data protection

### Real-time Updates
- Supabase Realtime subscriptions
- Automatic UI updates when data changes

## Security Best Practices

- Environment variables for sensitive data
- Row Level Security (RLS) policies
- Secure token storage
- Input validation and sanitization

## Development Commands

```bash
npm start          # Start Expo development server
npm run android    # Run on Android device/emulator
npm run ios        # Run on iOS device/simulator
npm run web        # Run in web browser
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## License

This project is licensed under the ISC License. 