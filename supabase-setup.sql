-- ===================================
-- Family Calendar 2.0 - Supabase Setup
-- ===================================
-- Run this script in your Supabase SQL editor to set up the database schema
-- Make sure to enable RLS (Row Level Security) on all tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===================================
-- USERS TABLE (formerly profiles)
-- ===================================
-- Store additional user profile information
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    avatar_url TEXT,
    timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- ===================================
-- FAMILIES TABLE
-- ===================================
-- Manage family groups
CREATE TABLE IF NOT EXISTS public.families (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;

-- ===================================
-- FAMILY_MEMBERS TABLE
-- ===================================
-- Junction table for family membership
CREATE TABLE IF NOT EXISTS public.family_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    family_id UUID REFERENCES public.families(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(family_id, user_id)
);

-- Enable RLS
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for families and family_members
CREATE POLICY "Family members can view their families" ON public.families
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.family_members 
            WHERE family_id = families.id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Family admins can update families" ON public.families
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.family_members 
            WHERE family_id = families.id AND user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can create families" ON public.families
    FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Simplified family_members policies to avoid recursion
CREATE POLICY "Users can view family memberships where they are members" ON public.family_members
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert themselves into families" ON public.family_members
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Family creators can manage initial membership" ON public.family_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.families 
            WHERE id = family_members.family_id AND created_by = auth.uid()
        )
    );

-- ===================================
-- EVENTS TABLE
-- ===================================
-- Store calendar events
CREATE TABLE IF NOT EXISTS public.events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    all_day BOOLEAN DEFAULT FALSE,
    location TEXT,
    color TEXT DEFAULT '#007AFF',
    family_id UUID REFERENCES public.families(id) ON DELETE CASCADE NOT NULL,
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for events
CREATE POLICY "Family members can view family events" ON public.events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.family_members 
            WHERE family_id = events.family_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Family members can create events" ON public.events
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.family_members 
            WHERE family_id = events.family_id AND user_id = auth.uid()
        ) AND auth.uid() = created_by
    );

CREATE POLICY "Event creators and family admins can update events" ON public.events
    FOR UPDATE USING (
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM public.family_members 
            WHERE family_id = events.family_id AND user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Event creators and family admins can delete events" ON public.events
    FOR DELETE USING (
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM public.family_members 
            WHERE family_id = events.family_id AND user_id = auth.uid() AND role = 'admin'
        )
    );

-- ===================================
-- TASKS TABLE
-- ===================================
-- Store family tasks and to-dos
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT FALSE,
    due_date TIMESTAMP WITH TIME ZONE,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    assigned_to UUID REFERENCES auth.users(id),
    family_id UUID REFERENCES public.families(id) ON DELETE CASCADE NOT NULL,
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tasks
CREATE POLICY "Family members can view family tasks" ON public.tasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.family_members 
            WHERE family_id = tasks.family_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Family members can create tasks" ON public.tasks
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.family_members 
            WHERE family_id = tasks.family_id AND user_id = auth.uid()
        ) AND auth.uid() = created_by
    );

CREATE POLICY "Task assignees and creators can update tasks" ON public.tasks
    FOR UPDATE USING (
        auth.uid() = assigned_to OR auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM public.family_members 
            WHERE family_id = tasks.family_id AND user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Task creators and family admins can delete tasks" ON public.tasks
    FOR DELETE USING (
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM public.family_members 
            WHERE family_id = tasks.family_id AND user_id = auth.uid() AND role = 'admin'
        )
    );

-- ===================================
-- NOTES TABLE
-- ===================================
-- Store family notes
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    tags TEXT[],
    family_id UUID REFERENCES public.families(id) ON DELETE CASCADE NOT NULL,
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notes
CREATE POLICY "Family members can view family notes" ON public.notes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.family_members 
            WHERE family_id = notes.family_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Family members can create notes" ON public.notes
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.family_members 
            WHERE family_id = notes.family_id AND user_id = auth.uid()
        ) AND auth.uid() = created_by
    );

CREATE POLICY "Note creators and family admins can update notes" ON public.notes
    FOR UPDATE USING (
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM public.family_members 
            WHERE family_id = notes.family_id AND user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Note creators and family admins can delete notes" ON public.notes
    FOR DELETE USING (
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM public.family_members 
            WHERE family_id = notes.family_id AND user_id = auth.uid() AND role = 'admin'
        )
    );

-- ===================================
-- CONTACTS TABLE
-- ===================================
-- Store family contacts
CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    notes TEXT,
    relationship TEXT,
    family_id UUID REFERENCES public.families(id) ON DELETE CASCADE NOT NULL,
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contacts
CREATE POLICY "Family members can view family contacts" ON public.contacts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.family_members 
            WHERE family_id = contacts.family_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Family members can create contacts" ON public.contacts
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.family_members 
            WHERE family_id = contacts.family_id AND user_id = auth.uid()
        ) AND auth.uid() = created_by
    );

CREATE POLICY "Contact creators and family admins can update contacts" ON public.contacts
    FOR UPDATE USING (
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM public.family_members 
            WHERE family_id = contacts.family_id AND user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Contact creators and family admins can delete contacts" ON public.contacts
    FOR DELETE USING (
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM public.family_members 
            WHERE family_id = contacts.family_id AND user_id = auth.uid() AND role = 'admin'
        )
    );

-- ===================================
-- FUNCTIONS AND TRIGGERS
-- ===================================

-- Function to handle profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, first_name, last_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'first_name', NEW.raw_user_meta_data ->> 'last_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to all tables
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.families
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.events
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.notes
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.contacts
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ===================================
-- INDEXES FOR PERFORMANCE
-- ===================================

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_family_members_family_id ON public.family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON public.family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_events_family_id ON public.events(family_id);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON public.events(start_date);
CREATE INDEX IF NOT EXISTS idx_tasks_family_id ON public.tasks(family_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_notes_family_id ON public.notes(family_id);
CREATE INDEX IF NOT EXISTS idx_contacts_family_id ON public.contacts(family_id);

-- ===================================
-- SAMPLE DATA (Optional - for testing)
-- ===================================

-- Uncomment below to insert sample data for testing
/*
INSERT INTO public.families (name, description, created_by) 
VALUES ('The Smith Family', 'Our lovely family calendar', auth.uid());
*/

-- ===================================
-- SETUP COMPLETE
-- ===================================
-- Your Family Calendar 2.0 database is now ready!
-- 
-- Next steps:
-- 1. Set up your environment variables in your app
-- 2. Configure email templates in Supabase Auth settings
-- 3. Set up any storage buckets if you plan to store files
-- 4. Configure your app's domain in Supabase Auth settings 