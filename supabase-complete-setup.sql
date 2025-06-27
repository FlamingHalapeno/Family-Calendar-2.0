-- ===================================
-- Family Calendar 2.0 - Complete Supabase Setup (All Fixes Included)
-- ===================================
-- Run this script in your Supabase SQL editor to set up the complete database schema
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
-- FAMILY_INVITES TABLE
-- ===================================
-- Store temporary invitation codes for families
CREATE TABLE IF NOT EXISTS public.family_invites (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    family_id UUID REFERENCES public.families(id) ON DELETE CASCADE NOT NULL,
    code TEXT NOT NULL UNIQUE,
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (timezone('utc'::text, now()) + INTERVAL '24 hours') NOT NULL
);

-- Enable RLS
ALTER TABLE public.family_invites ENABLE ROW LEVEL SECURITY;

-- ===================================
-- LINKED_CALENDARS TABLE (NEW)
-- ===================================
-- Stores connections to external calendar providers (Google, Outlook, etc.)
CREATE TABLE IF NOT EXISTS public.linked_calendars (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    family_id UUID REFERENCES public.families(id) ON DELETE CASCADE NOT NULL,
    provider TEXT NOT NULL, -- e.g., 'google', 'outlook'
    account_email TEXT NOT NULL, -- The email of the external account
    calendar_id TEXT NOT NULL, -- The specific ID of the calendar from the provider
    calendar_name TEXT,
    access_token TEXT NOT NULL, -- This MUST be encrypted before storing
    refresh_token TEXT, -- This MUST be encrypted before storing
    expires_at TIMESTAMP WITH TIME ZONE,
    color TEXT DEFAULT '#007AFF' NOT NULL, -- User-defined color for this calendar in the app
    is_synced BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, provider, calendar_id)
);

-- Add comments on sensitive columns
COMMENT ON COLUMN public.linked_calendars.access_token IS 'This should be encrypted before storing. Use Supabase Vault.';
COMMENT ON COLUMN public.linked_calendars.refresh_token IS 'This should be encrypted before storing. Use Supabase Vault.';

-- Enable RLS
ALTER TABLE public.linked_calendars ENABLE ROW LEVEL SECURITY;

-- RLS Policies for linked_calendars (CREATE OR REPLACE to handle existing)
DO $$ 
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view their own linked calendars" ON public.linked_calendars;
    DROP POLICY IF EXISTS "Users can insert their own linked calendars" ON public.linked_calendars;
    DROP POLICY IF EXISTS "Users can update their own linked calendars" ON public.linked_calendars;
    DROP POLICY IF EXISTS "Users can delete their own linked calendars" ON public.linked_calendars;
    DROP POLICY IF EXISTS "Family members can view linked calendars" ON public.linked_calendars;
END $$;

-- Create RLS policies
CREATE POLICY "Users can view their own linked calendars" ON public.linked_calendars FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own linked calendars" ON public.linked_calendars FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own linked calendars" ON public.linked_calendars FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own linked calendars" ON public.linked_calendars FOR DELETE USING (auth.uid() = user_id);

-- Family members can view each other's linked calendars
CREATE POLICY "Family members can view linked calendars" ON public.linked_calendars FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.family_members fm1
        JOIN public.family_members fm2 ON fm1.family_id = fm2.family_id
        WHERE fm1.user_id = auth.uid() AND fm2.user_id = linked_calendars.user_id
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    -- NEW COLUMNS FOR EXTERNAL CALENDAR INTEGRATION
    linked_calendar_id UUID REFERENCES public.linked_calendars(id) ON DELETE SET NULL,
    external_event_id TEXT -- Stores the event ID from the external provider (e.g., Google Calendar)
);

-- Add columns to existing events table if they don't exist
DO $$ 
BEGIN
    -- Add linked_calendar_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'linked_calendar_id') THEN
        ALTER TABLE public.events ADD COLUMN linked_calendar_id UUID REFERENCES public.linked_calendars(id) ON DELETE SET NULL;
    END IF;
    
    -- Add external_event_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'external_event_id') THEN
        ALTER TABLE public.events ADD COLUMN external_event_id TEXT;
    END IF;
END $$;

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
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM public.family_members
    WHERE family_id = p_family_id AND user_id = p_user_id;
    
    RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get a user's family ID
CREATE OR REPLACE FUNCTION get_user_family_id(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    family_id_result UUID;
BEGIN
    SELECT family_id INTO family_id_result
    FROM public.family_members
    WHERE user_id = p_user_id
    LIMIT 1;
    
    RETURN family_id_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================
-- RLS POLICIES
-- ===================================

-- Users table policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;

CREATE POLICY "Users can view their own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- Family members can view each other's basic info
DROP POLICY IF EXISTS "Family members can view each other" ON public.users;
CREATE POLICY "Family members can view each other" ON public.users FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.family_members fm1
        JOIN public.family_members fm2 ON fm1.family_id = fm2.family_id
        WHERE fm1.user_id = auth.uid() AND fm2.user_id = users.id
    )
);

-- Families table policies
DROP POLICY IF EXISTS "Family members can view their family" ON public.families;
DROP POLICY IF EXISTS "Family creators can update their family" ON public.families;
DROP POLICY IF EXISTS "Authenticated users can create families" ON public.families;

CREATE POLICY "Family members can view their family" ON public.families FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.family_members
        WHERE family_id = families.id AND user_id = auth.uid()
    )
);

CREATE POLICY "Family creators can update their family" ON public.families FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "Authenticated users can create families" ON public.families FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Family members table policies
DROP POLICY IF EXISTS "Family members can view family members" ON public.family_members;
DROP POLICY IF EXISTS "Family admins can manage members" ON public.family_members;
DROP POLICY IF EXISTS "Users can join families" ON public.family_members;
DROP POLICY IF EXISTS "Users can leave families" ON public.family_members;

CREATE POLICY "Family members can view family members" ON public.family_members FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.family_members fm
        WHERE fm.family_id = family_members.family_id AND fm.user_id = auth.uid()
    )
);

CREATE POLICY "Family admins can manage members" ON public.family_members FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.family_members fm
        WHERE fm.family_id = family_members.family_id AND fm.user_id = auth.uid() AND fm.role = 'admin'
    )
);

CREATE POLICY "Users can join families" ON public.family_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave families" ON public.family_members FOR DELETE USING (auth.uid() = user_id);

-- Family invites table policies
DROP POLICY IF EXISTS "Family members can view invites" ON public.family_invites;
DROP POLICY IF EXISTS "Family admins can create invites" ON public.family_invites;
DROP POLICY IF EXISTS "Anyone can view invites to join" ON public.family_invites;

CREATE POLICY "Family members can view invites" ON public.family_invites FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.family_members fm
        WHERE fm.family_id = family_invites.family_id AND fm.user_id = auth.uid()
    )
);

CREATE POLICY "Family admins can create invites" ON public.family_invites FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.family_members fm
        WHERE fm.family_id = family_invites.family_id AND fm.user_id = auth.uid() AND fm.role = 'admin'
    ) AND auth.uid() = created_by
);

CREATE POLICY "Anyone can view invites to join" ON public.family_invites FOR SELECT USING (true);

-- Events table policies
DROP POLICY IF EXISTS "Family members can view events" ON public.events;
DROP POLICY IF EXISTS "Family members can create events" ON public.events;
DROP POLICY IF EXISTS "Event creators can update events" ON public.events;
DROP POLICY IF EXISTS "Event creators can delete events" ON public.events;

CREATE POLICY "Family members can view events" ON public.events FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.family_members fm
        WHERE fm.family_id = events.family_id AND fm.user_id = auth.uid()
    )
);

CREATE POLICY "Family members can create events" ON public.events FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.family_members fm
        WHERE fm.family_id = events.family_id AND fm.user_id = auth.uid()
    ) AND auth.uid() = created_by
);

CREATE POLICY "Event creators can update events" ON public.events FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "Event creators can delete events" ON public.events FOR DELETE USING (created_by = auth.uid());

-- Tasks table policies
DROP POLICY IF EXISTS "Family members can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Family members can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Task creators and assignees can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Task creators can delete tasks" ON public.tasks;

CREATE POLICY "Family members can view tasks" ON public.tasks FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.family_members fm
        WHERE fm.family_id = tasks.family_id AND fm.user_id = auth.uid()
    )
);

CREATE POLICY "Family members can create tasks" ON public.tasks FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.family_members fm
        WHERE fm.family_id = tasks.family_id AND fm.user_id = auth.uid()
    ) AND auth.uid() = created_by
);

CREATE POLICY "Task creators and assignees can update tasks" ON public.tasks FOR UPDATE USING (
    created_by = auth.uid() OR assigned_to = auth.uid()
);

CREATE POLICY "Task creators can delete tasks" ON public.tasks FOR DELETE USING (created_by = auth.uid());

-- Notes table policies
DROP POLICY IF EXISTS "Family members can view notes" ON public.notes;
DROP POLICY IF EXISTS "Family members can create notes" ON public.notes;
DROP POLICY IF EXISTS "Note creators can update notes" ON public.notes;
DROP POLICY IF EXISTS "Note creators can delete notes" ON public.notes;

CREATE POLICY "Family members can view notes" ON public.notes FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.family_members fm
        WHERE fm.family_id = notes.family_id AND fm.user_id = auth.uid()
    )
);

CREATE POLICY "Family members can create notes" ON public.notes FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.family_members fm
        WHERE fm.family_id = notes.family_id AND fm.user_id = auth.uid()
    ) AND auth.uid() = created_by
);

CREATE POLICY "Note creators can update notes" ON public.notes FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "Note creators can delete notes" ON public.notes FOR DELETE USING (created_by = auth.uid());

-- Contacts table policies
DROP POLICY IF EXISTS "Family members can view contacts" ON public.contacts;
DROP POLICY IF EXISTS "Family members can create contacts" ON public.contacts;
DROP POLICY IF EXISTS "Contact creators can update contacts" ON public.contacts;
DROP POLICY IF EXISTS "Contact creators can delete contacts" ON public.contacts;

CREATE POLICY "Family members can view contacts" ON public.contacts FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.family_members fm
        WHERE fm.family_id = contacts.family_id AND fm.user_id = auth.uid()
    )
);

CREATE POLICY "Family members can create contacts" ON public.contacts FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.family_members fm
        WHERE fm.family_id = contacts.family_id AND fm.user_id = auth.uid()
    ) AND auth.uid() = created_by
);

CREATE POLICY "Contact creators can update contacts" ON public.contacts FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "Contact creators can delete contacts" ON public.contacts FOR DELETE USING (created_by = auth.uid());

-- ===================================
-- HELPER FUNCTIONS
-- ===================================

-- Function to get family members for a user (for the app to use)
CREATE OR REPLACE FUNCTION public.get_my_family_members(p_user_id UUID)
RETURNS TABLE(
    id UUID,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    role TEXT,
    joined_at TIMESTAMP WITH TIME ZONE,
    avatar_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        fm.role,
        fm.joined_at,
        u.avatar_url
    FROM public.users u
    JOIN public.family_members fm ON u.id = fm.user_id
    WHERE fm.family_id = (
        SELECT family_id 
        FROM public.family_members 
        WHERE user_id = p_user_id 
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's family ID
CREATE OR REPLACE FUNCTION get_my_family_id(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    family_id_result UUID;
BEGIN
    SELECT family_id INTO family_id_result
    FROM public.family_members
    WHERE user_id = p_user_id
    LIMIT 1;
    
    RETURN family_id_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove a family member (enhanced to handle managed accounts)
CREATE OR REPLACE FUNCTION remove_family_member(user_id_to_remove UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_user_email TEXT;
    is_managed_account BOOLEAN := FALSE;
BEGIN
    -- Get the user's email to check if it's a managed account
    SELECT email INTO target_user_email
    FROM auth.users
    WHERE id = user_id_to_remove;
    
    -- Check if it's a managed account (no email or email contains @local.app)
    IF target_user_email IS NULL OR target_user_email LIKE '%@local.app' THEN
        is_managed_account := TRUE;
    END IF;
    
    -- Remove from family_members
    DELETE FROM public.family_members 
    WHERE user_id = user_id_to_remove;
    
    -- If it's a managed account, delete the user entirely
    IF is_managed_account THEN
        -- Delete from users table (cascade will handle related records)
        DELETE FROM public.users WHERE id = user_id_to_remove;
        
        -- Delete from auth.users
        DELETE FROM auth.users WHERE id = user_id_to_remove;
    END IF;
END;
$$;

-- Function to create a new family
CREATE OR REPLACE FUNCTION public.create_new_family(p_user_id UUID, p_family_name TEXT, p_family_description TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_family_id UUID;
BEGIN
    -- Create the family
    INSERT INTO public.families (name, description, created_by)
    VALUES (p_family_name, COALESCE(p_family_description, ''), p_user_id)
    RETURNING id INTO new_family_id;
    
    -- Add the creator as an admin
    INSERT INTO public.family_members (family_id, user_id, role)
    VALUES (new_family_id, p_user_id, 'admin');
    
    RETURN new_family_id;
END;
$$;

-- Function to generate a family invite code
CREATE OR REPLACE FUNCTION public.generate_family_invite_code(p_family_id UUID, p_creator_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    invite_code TEXT;
    code_exists BOOLEAN;
BEGIN
    -- Check if user is admin of the family
    IF NOT EXISTS (
        SELECT 1 FROM public.family_members 
        WHERE family_id = p_family_id AND user_id = p_creator_id AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Only family admins can create invite codes';
    END IF;
    
    -- Generate a unique 8-character code
    LOOP
        invite_code := upper(substring(gen_random_uuid()::text from 1 for 8));
        
        -- Check if code already exists
        SELECT EXISTS (
            SELECT 1 FROM public.family_invites 
            WHERE code = invite_code AND expires_at > now()
        ) INTO code_exists;
        
        EXIT WHEN NOT code_exists;
    END LOOP;
    
    -- Delete any existing invites for this family
    DELETE FROM public.family_invites 
    WHERE family_id = p_family_id;
    
    -- Insert the new invite
    INSERT INTO public.family_invites (family_id, code, created_by)
    VALUES (p_family_id, invite_code, p_creator_id);
    
    RETURN invite_code;
END;
$$;

-- ===================================
-- TRIGGERS
-- ===================================

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, first_name, last_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'last_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to handle updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS handle_updated_at ON public.users;
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
DROP TRIGGER IF EXISTS handle_updated_at ON public.families;
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.families FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
DROP TRIGGER IF EXISTS handle_updated_at ON public.events;
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
DROP TRIGGER IF EXISTS handle_updated_at ON public.tasks;
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
DROP TRIGGER IF EXISTS handle_updated_at ON public.notes;
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
DROP TRIGGER IF EXISTS handle_updated_at ON public.contacts;
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
DROP TRIGGER IF EXISTS handle_updated_at ON public.linked_calendars;
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.linked_calendars FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ===================================
-- INDEXES
-- ===================================
CREATE INDEX IF NOT EXISTS idx_family_members_family_id ON public.family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON public.family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_events_family_id ON public.events(family_id);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON public.events(start_date);
CREATE INDEX IF NOT EXISTS idx_tasks_family_id ON public.tasks(family_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_notes_family_id ON public.notes(family_id);
CREATE INDEX IF NOT EXISTS idx_contacts_family_id ON public.contacts(family_id);
CREATE INDEX IF NOT EXISTS idx_linked_calendars_user_id ON public.linked_calendars(user_id);
CREATE INDEX IF NOT EXISTS idx_linked_calendars_family_id ON public.linked_calendars(family_id);
CREATE INDEX IF NOT EXISTS idx_linked_calendars_provider ON public.linked_calendars(provider);
CREATE INDEX IF NOT EXISTS idx_events_linked_calendar ON public.events(linked_calendar_id);
CREATE INDEX IF NOT EXISTS idx_events_external_id ON public.events(external_event_id);

-- ===================================
-- ADDITIONAL FUNCTIONS
-- ===================================

-- Function to promote a family member to admin
CREATE OR REPLACE FUNCTION public.promote_family_member(p_member_user_id UUID, p_family_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if the requesting user is an admin of the family
    IF NOT EXISTS (
        SELECT 1 FROM public.family_members 
        WHERE family_id = p_family_id AND user_id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Only family admins can promote members';
    END IF;
    
    -- Check if the target user is a member of the family
    IF NOT EXISTS (
        SELECT 1 FROM public.family_members 
        WHERE family_id = p_family_id AND user_id = p_member_user_id
    ) THEN
        RAISE EXCEPTION 'User is not a member of this family';
    END IF;
    
    -- Promote the member to admin
    UPDATE public.family_members 
    SET role = 'admin' 
    WHERE family_id = p_family_id AND user_id = p_member_user_id;
END;
$$;

-- Function to demote a family member from admin to member
CREATE OR REPLACE FUNCTION public.demote_family_member(p_member_user_id UUID, p_family_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    admin_count INTEGER;
BEGIN
    -- Check if the requesting user is an admin of the family
    IF NOT EXISTS (
        SELECT 1 FROM public.family_members 
        WHERE family_id = p_family_id AND user_id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Only family admins can demote members';
    END IF;
    
    -- Check if the target user is an admin of the family
    IF NOT EXISTS (
        SELECT 1 FROM public.family_members 
        WHERE family_id = p_family_id AND user_id = p_member_user_id AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'User is not an admin of this family';
    END IF;
    
    -- Count current admins
    SELECT COUNT(*) INTO admin_count
    FROM public.family_members 
    WHERE family_id = p_family_id AND role = 'admin';
    
    -- Prevent demoting the last admin
    IF admin_count <= 1 THEN
        RAISE EXCEPTION 'Cannot demote the last admin. Promote another member first.';
    END IF;
    
    -- Demote the admin to member
    UPDATE public.family_members 
    SET role = 'member' 
    WHERE family_id = p_family_id AND user_id = p_member_user_id;
END;
$$;
