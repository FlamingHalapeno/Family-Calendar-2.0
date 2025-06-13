-- ===================================
-- Family Calendar 2.0 - Complete Supabase Setup
-- ===================================
-- Run this script in your Supabase SQL editor to set up the complete database schema
-- Make sure to run the cleanup script first if your project is not empty
-- This script enables RLS (Row Level Security) on all tables

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



-- ===================================
-- UTILITY FUNCTIONS (needed for RLS policies)
-- ===================================

-- Function to get the role of a user in a given family
CREATE OR REPLACE FUNCTION get_family_role(p_family_id UUID, p_user_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.family_members WHERE family_id = p_family_id AND user_id = p_user_id;
$$;

-- Function to get a user's family ID (used in RLS policies to avoid recursion)
CREATE OR REPLACE FUNCTION get_user_family_id(p_user_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT family_id FROM public.family_members WHERE user_id = p_user_id LIMIT 1;
$$;

-- ===================================
-- ROW LEVEL SECURITY POLICIES
-- ===================================

-- Users table policies
CREATE POLICY "Users can view profiles of self and family members" ON public.users
    FOR SELECT USING (
        auth.uid() = users.id
        OR users.id IN (
            SELECT fm.user_id
            FROM public.family_members fm
            WHERE fm.family_id = get_user_family_id(auth.uid())
        )
    );

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Families table policies
CREATE POLICY "Family members can view their families" ON public.families
    FOR SELECT USING (families.id = get_user_family_id(auth.uid()));

CREATE POLICY "Family admins can update families" ON public.families
    FOR UPDATE USING (
        families.id = get_user_family_id(auth.uid()) AND
        get_family_role(families.id, auth.uid()) = 'admin'
    );

CREATE POLICY "Users can create families" ON public.families
    FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Family members table policies
-- Dropping old policies to be replaced
DROP POLICY IF EXISTS "Family members can view memberships in families they belong to" ON public.family_members;
DROP POLICY IF EXISTS "Users can insert themselves into families" ON public.family_members;
DROP POLICY IF EXISTS "Family creators and admins can manage membership" ON public.family_members;
DROP POLICY IF EXISTS "Family members can view memberships" ON public.family_members;
DROP POLICY IF EXISTS "Users can join families" ON public.family_members;
DROP POLICY IF EXISTS "Admins can add members" ON public.family_members;
DROP POLICY IF EXISTS "Members can leave and admins can remove members" ON public.family_members;
DROP POLICY IF EXISTS "Admins can update memberships" ON public.family_members;

-- Simple, non-recursive policies
-- Allow users to view their own memberships and other members in their families
CREATE POLICY "Users can view family memberships" ON public.family_members
    FOR SELECT USING (
        user_id = auth.uid() OR
        family_id = get_user_family_id(auth.uid())
    );

CREATE POLICY "Users can join families" ON public.family_members
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave families" ON public.family_members
    FOR DELETE USING (user_id = auth.uid());
-- Events table policies
CREATE POLICY "Family members can view family events" ON public.events
    FOR SELECT USING (events.family_id = get_user_family_id(auth.uid()));

CREATE POLICY "Family members can create events" ON public.events
    FOR INSERT WITH CHECK (
        events.family_id = get_user_family_id(auth.uid()) AND
        auth.uid() = created_by
    );

CREATE POLICY "Event creators and family admins can update events" ON public.events
    FOR UPDATE USING (
        auth.uid() = created_by OR
        (events.family_id = get_user_family_id(auth.uid()) AND
         get_family_role(events.family_id, auth.uid()) = 'admin')
    );

CREATE POLICY "Event creators and family admins can delete events" ON public.events
    FOR DELETE USING (
        auth.uid() = created_by OR
        (events.family_id = get_user_family_id(auth.uid()) AND
         get_family_role(events.family_id, auth.uid()) = 'admin')
    );

-- Tasks table policies
CREATE POLICY "Family members can view family tasks" ON public.tasks
    FOR SELECT USING (tasks.family_id = get_user_family_id(auth.uid()));

CREATE POLICY "Family members can create tasks" ON public.tasks
    FOR INSERT WITH CHECK (
        tasks.family_id = get_user_family_id(auth.uid()) AND
        auth.uid() = created_by
    );

CREATE POLICY "Task assignees and creators can update tasks" ON public.tasks
    FOR UPDATE USING (
        auth.uid() = assigned_to OR auth.uid() = created_by OR
        (tasks.family_id = get_user_family_id(auth.uid()) AND
         get_family_role(tasks.family_id, auth.uid()) = 'admin')
    );

CREATE POLICY "Task creators and family admins can delete tasks" ON public.tasks
    FOR DELETE USING (
        auth.uid() = created_by OR
        (tasks.family_id = get_user_family_id(auth.uid()) AND
         get_family_role(tasks.family_id, auth.uid()) = 'admin')
    );

-- Notes table policies
CREATE POLICY "Family members can view family notes" ON public.notes
    FOR SELECT USING (notes.family_id = get_user_family_id(auth.uid()));

CREATE POLICY "Family members can create notes" ON public.notes
    FOR INSERT WITH CHECK (
        notes.family_id = get_user_family_id(auth.uid()) AND
        auth.uid() = created_by
    );

CREATE POLICY "Note creators and family admins can update notes" ON public.notes
    FOR UPDATE USING (
        auth.uid() = created_by OR
        (notes.family_id = get_user_family_id(auth.uid()) AND
         get_family_role(notes.family_id, auth.uid()) = 'admin')
    );

CREATE POLICY "Note creators and family admins can delete notes" ON public.notes
    FOR DELETE USING (
        auth.uid() = created_by OR
        (notes.family_id = get_user_family_id(auth.uid()) AND
         get_family_role(notes.family_id, auth.uid()) = 'admin')
    );

-- Contacts table policies
CREATE POLICY "Family members can view family contacts" ON public.contacts
    FOR SELECT USING (contacts.family_id = get_user_family_id(auth.uid()));

CREATE POLICY "Family members can create contacts" ON public.contacts
    FOR INSERT WITH CHECK (
        contacts.family_id = get_user_family_id(auth.uid()) AND
        auth.uid() = created_by
    );

CREATE POLICY "Contact creators and family admins can update contacts" ON public.contacts
    FOR UPDATE USING (
        auth.uid() = created_by OR
        (contacts.family_id = get_user_family_id(auth.uid()) AND
         get_family_role(contacts.family_id, auth.uid()) = 'admin')
    );

CREATE POLICY "Contact creators and family admins can delete contacts" ON public.contacts
    FOR DELETE USING (
        auth.uid() = created_by OR
        (contacts.family_id = get_user_family_id(auth.uid()) AND
         get_family_role(contacts.family_id, auth.uid()) = 'admin')
    );

-- ===================================
-- UTILITY AND BUSINESS LOGIC FUNCTIONS
-- ===================================

-- Function to get all members of the current user's family
CREATE OR REPLACE FUNCTION get_my_family_members()
RETURNS TABLE (
    id UUID,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    role TEXT,
    avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_family_id UUID;
BEGIN
    -- Get the family_id of the current user
    SELECT family_id INTO v_family_id
    FROM public.family_members
    WHERE user_id = auth.uid()
    LIMIT 1;

    -- If user is not in any family, return empty result
    IF v_family_id IS NULL THEN
        RETURN;
    END IF;

    -- Return all members of that family
    RETURN QUERY
    SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        fm.role,
        u.avatar_url
    FROM
        public.family_members fm
    JOIN
        public.users u ON fm.user_id = u.id
    WHERE
        fm.family_id = v_family_id;
END;
$$;

-- Function to remove a member from the current user's family
CREATE OR REPLACE FUNCTION remove_family_member(user_id_to_remove UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_family_id UUID;
    v_user_role TEXT;
BEGIN
    -- Check if the user to be removed is the current user
    IF auth.uid() = user_id_to_remove THEN
        RAISE EXCEPTION 'You cannot remove yourself from the family.';
    END IF;

    -- Get the family_id and role of the current user
    SELECT family_id, role INTO v_family_id, v_user_role
    FROM public.family_members
    WHERE user_id = auth.uid()
    LIMIT 1;

    -- Check if the current user is an admin
    IF v_user_role <> 'admin' THEN
        RAISE EXCEPTION 'Only admins can remove family members.';
    END IF;

    -- Check if the user to be removed is in the same family
    IF NOT EXISTS (
        SELECT 1
        FROM public.family_members
        WHERE user_id = user_id_to_remove AND family_id = v_family_id
    ) THEN
        RAISE EXCEPTION 'User is not a member of this family.';
    END IF;

    -- Remove the member
    DELETE FROM public.family_members
    WHERE user_id = user_id_to_remove AND family_id = v_family_id;
END;
$$;

-- ===================================
-- TRIGGER FUNCTIONS
-- ===================================

-- Function to handle profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_first_name TEXT;
    v_last_name TEXT;
BEGIN
    -- Extract names from metadata
    v_first_name := NEW.raw_user_meta_data ->> 'first_name';
    v_last_name := NEW.raw_user_meta_data ->> 'last_name';

    -- Create user profile only
    INSERT INTO public.users (id, email, first_name, last_name)
    VALUES (NEW.id, NEW.email, v_first_name, v_last_name);

    -- Note: Family creation and membership will be handled separately
    -- in a later step of the user onboarding process

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- TRIGGERS
-- ===================================

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

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
-- SETUP COMPLETE
-- ===================================
-- Your Family Calendar 2.0 database is now ready!
-- 
-- Next steps:
-- 1. Set up your environment variables in your app
-- 2. Configure email templates in Supabase Auth settings
-- 3. Set up any storage buckets if you plan to store files
-- 4. Configure your app's domain in Supabase Auth settings 