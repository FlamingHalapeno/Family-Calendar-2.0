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
DROP POLICY IF EXISTS "Users can view profiles of self and family members" ON public.users;
CREATE POLICY "Users can view profiles of self and family members" ON public.users
    FOR SELECT USING (
        auth.uid() = users.id
        OR users.id IN (
            SELECT fm.user_id
            FROM public.family_members fm
            WHERE fm.family_id = get_user_family_id(auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
CREATE POLICY "Users can insert their own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Families table policies
DROP POLICY IF EXISTS "Family members can view their families" ON public.families;
CREATE POLICY "Family members can view their families" ON public.families
    FOR SELECT USING (families.id = get_user_family_id(auth.uid()));

DROP POLICY IF EXISTS "Family admins can update families" ON public.families;
CREATE POLICY "Family admins can update families" ON public.families
    FOR UPDATE USING (
        families.id = get_user_family_id(auth.uid()) AND
        get_family_role(families.id, auth.uid()) = 'admin'
    );

DROP POLICY IF EXISTS "Users can create families" ON public.families;
DROP POLICY IF EXISTS "Authenticated users can create families" ON public.families;
CREATE POLICY "Users can create families" ON public.families
    FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Family members table policies
DROP POLICY IF EXISTS "Users can view family memberships" ON public.family_members;
CREATE POLICY "Users can view family memberships" ON public.family_members
    FOR SELECT USING (
        user_id = auth.uid() OR
        family_id = get_user_family_id(auth.uid())
    );

DROP POLICY IF EXISTS "Users can join families" ON public.family_members;
CREATE POLICY "Users can join families" ON public.family_members
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can leave families" ON public.family_members;
CREATE POLICY "Users can leave families" ON public.family_members
    FOR DELETE USING (user_id = auth.uid());
    
-- Family Invites table policies
DROP POLICY IF EXISTS "Family admins can create invite codes" ON public.family_invites;
CREATE POLICY "Family admins can create invite codes" ON public.family_invites
    FOR INSERT WITH CHECK (
        created_by = auth.uid() AND
        get_family_role(family_id, auth.uid()) = 'admin'
    );

DROP POLICY IF EXISTS "Authenticated users can read invite codes" ON public.family_invites;
CREATE POLICY "Authenticated users can read invite codes" ON public.family_invites
    FOR SELECT USING (auth.role() = 'authenticated');


-- Events table policies
DROP POLICY IF EXISTS "Family members can view family events" ON public.events;
CREATE POLICY "Family members can view family events" ON public.events
    FOR SELECT USING (events.family_id = get_user_family_id(auth.uid()));

DROP POLICY IF EXISTS "Family members can create events" ON public.events;
CREATE POLICY "Family members can create events" ON public.events
    FOR INSERT WITH CHECK (
        events.family_id = get_user_family_id(auth.uid()) AND
        auth.uid() = created_by
    );

DROP POLICY IF EXISTS "Event creators and family admins can update events" ON public.events;
CREATE POLICY "Event creators and family admins can update events" ON public.events
    FOR UPDATE USING (
        auth.uid() = created_by OR
        (events.family_id = get_user_family_id(auth.uid()) AND
         get_family_role(events.family_id, auth.uid()) = 'admin')
    );

DROP POLICY IF EXISTS "Event creators and family admins can delete events" ON public.events;
CREATE POLICY "Event creators and family admins can delete events" ON public.events
    FOR DELETE USING (
        auth.uid() = created_by OR
        (events.family_id = get_user_family_id(auth.uid()) AND
         get_family_role(events.family_id, auth.uid()) = 'admin')
    );

-- Tasks table policies
DROP POLICY IF EXISTS "Family members can view family tasks" ON public.tasks;
CREATE POLICY "Family members can view family tasks" ON public.tasks
    FOR SELECT USING (tasks.family_id = get_user_family_id(auth.uid()));

DROP POLICY IF EXISTS "Family members can create tasks" ON public.tasks;
CREATE POLICY "Family members can create tasks" ON public.tasks
    FOR INSERT WITH CHECK (
        tasks.family_id = get_user_family_id(auth.uid()) AND
        auth.uid() = created_by
    );

DROP POLICY IF EXISTS "Task assignees and creators can update tasks" ON public.tasks;
CREATE POLICY "Task assignees and creators can update tasks" ON public.tasks
    FOR UPDATE USING (
        auth.uid() = assigned_to OR auth.uid() = created_by OR
        (tasks.family_id = get_user_family_id(auth.uid()) AND
         get_family_role(tasks.family_id, auth.uid()) = 'admin')
    );

DROP POLICY IF EXISTS "Task creators and family admins can delete tasks" ON public.tasks;
CREATE POLICY "Task creators and family admins can delete tasks" ON public.tasks
    FOR DELETE USING (
        auth.uid() = created_by OR
        (tasks.family_id = get_user_family_id(auth.uid()) AND
         get_family_role(tasks.family_id, auth.uid()) = 'admin')
    );

-- Notes table policies
DROP POLICY IF EXISTS "Family members can view family notes" ON public.notes;
CREATE POLICY "Family members can view family notes" ON public.notes
    FOR SELECT USING (notes.family_id = get_user_family_id(auth.uid()));

DROP POLICY IF EXISTS "Family members can create notes" ON public.notes;
CREATE POLICY "Family members can create notes" ON public.notes
    FOR INSERT WITH CHECK (
        notes.family_id = get_user_family_id(auth.uid()) AND
        auth.uid() = created_by
    );

DROP POLICY IF EXISTS "Note creators and family admins can update notes" ON public.notes;
CREATE POLICY "Note creators and family admins can update notes" ON public.notes
    FOR UPDATE USING (
        auth.uid() = created_by OR
        (notes.family_id = get_user_family_id(auth.uid()) AND
         get_family_role(notes.family_id, auth.uid()) = 'admin')
    );

DROP POLICY IF EXISTS "Note creators and family admins can delete notes" ON public.notes;
CREATE POLICY "Note creators and family admins can delete notes" ON public.notes
    FOR DELETE USING (
        auth.uid() = created_by OR
        (notes.family_id = get_user_family_id(auth.uid()) AND
         get_family_role(notes.family_id, auth.uid()) = 'admin')
    );

-- Contacts table policies
DROP POLICY IF EXISTS "Family members can view family contacts" ON public.contacts;
CREATE POLICY "Family members can view family contacts" ON public.contacts
    FOR SELECT USING (contacts.family_id = get_user_family_id(auth.uid()));

DROP POLICY IF EXISTS "Family members can create contacts" ON public.contacts;
CREATE POLICY "Family members can create contacts" ON public.contacts
    FOR INSERT WITH CHECK (
        contacts.family_id = get_user_family_id(auth.uid()) AND
        auth.uid() = created_by
    );

DROP POLICY IF EXISTS "Contact creators and family admins can update contacts" ON public.contacts;
CREATE POLICY "Contact creators and family admins can update contacts" ON public.contacts
    FOR UPDATE USING (
        auth.uid() = created_by OR
        (contacts.family_id = get_user_family_id(auth.uid()) AND
         get_family_role(contacts.family_id, auth.uid()) = 'admin')
    );

DROP POLICY IF EXISTS "Contact creators and family admins can delete contacts" ON public.contacts;
CREATE POLICY "Contact creators and family admins can delete contacts" ON public.contacts
    FOR DELETE USING (
        auth.uid() = created_by OR
        (contacts.family_id = get_user_family_id(auth.uid()) AND
         get_family_role(contacts.family_id, auth.uid()) = 'admin')
    );

-- ===================================
-- UTILITY AND BUSINESS LOGIC FUNCTIONS
-- ===================================

-- Function to get all members of a user's family
CREATE OR REPLACE FUNCTION public.get_my_family_members(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    role TEXT,
    avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_family_id UUID;
BEGIN
    -- Get the family_id of the specified user
    SELECT family_id INTO v_family_id
    FROM public.family_members
    WHERE user_id = p_user_id
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

-- Function to get the current user's family ID directly (for client-side use)
CREATE OR REPLACE FUNCTION get_my_family_id(p_user_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT family_id FROM public.family_members WHERE user_id = p_user_id LIMIT 1;
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

-- ========== NEW FUNCTION FOR CREATING FAMILIES ==========
DROP FUNCTION IF EXISTS public.create_new_family(text, text);
DROP FUNCTION IF EXISTS public.create_new_family(uuid, text, text);

CREATE OR REPLACE FUNCTION public.create_new_family(p_user_id UUID, p_family_name TEXT, p_family_description TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_family_id UUID;
BEGIN
    -- Check if the provided user is already in a family
    IF EXISTS (SELECT 1 FROM public.family_members WHERE user_id = p_user_id) THEN
        RAISE EXCEPTION 'User is already in a family.';
    END IF;

    -- Create the new family using the passed-in user ID
    INSERT INTO public.families (name, description, created_by)
    VALUES (p_family_name, p_family_description, p_user_id)
    RETURNING id INTO v_new_family_id;

    -- Add the creator as an admin member of the new family
    INSERT INTO public.family_members (family_id, user_id, role)
    VALUES (v_new_family_id, p_user_id, 'admin');

    RETURN v_new_family_id;
END;
$$;

-- Function to generate a new invite code for a family
DROP FUNCTION IF EXISTS public.generate_family_invite_code(UUID);
CREATE OR REPLACE FUNCTION public.generate_family_invite_code(p_family_id UUID, p_creator_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_code TEXT;
BEGIN
    -- Use the passed-in creator ID for the role check
    IF get_family_role(p_family_id, p_creator_id) <> 'admin' THEN
        RAISE EXCEPTION 'Only admins can generate invite codes.';
    END IF;

    -- Generate a unique 5-digit code
    LOOP
        v_code := substr(floor(random() * 90000 + 10000)::text, 1, 5);
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.family_invites WHERE code = v_code AND expires_at > now());
    END LOOP;

    -- Insert the new code into the table, using the passed-in creator ID
    INSERT INTO public.family_invites (family_id, code, created_by)
    VALUES (p_family_id, v_code, p_creator_id);

    RETURN v_code;
END;
$$;

-- Function for a user to join a family using a code
CREATE OR REPLACE FUNCTION public.join_family_with_code(p_code TEXT, p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_family_id UUID;
    v_invite_id UUID;
BEGIN
    -- Find a valid, unexpired invite
    SELECT id, family_id INTO v_invite_id, v_family_id
    FROM public.family_invites
    WHERE code = p_code AND expires_at > now()
    LIMIT 1;

    IF v_family_id IS NULL THEN
        RAISE EXCEPTION 'Invalid or expired invitation code.';
    END IF;

    -- Add the current user to the family
    INSERT INTO public.family_members (family_id, user_id, role)
    VALUES (v_family_id, p_user_id, 'member');

    -- Delete the used invite code
    DELETE FROM public.family_invites WHERE id = v_invite_id;

    RETURN v_family_id;
END;
$$;


-- ===================================
-- TRIGGER FUNCTIONS AND TRIGGERS
-- ===================================

-- Function to handle profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_first_name TEXT;
    v_last_name TEXT;
BEGIN
    v_first_name := NEW.raw_user_meta_data ->> 'first_name';
    v_last_name := NEW.raw_user_meta_data ->> 'last_name';
    INSERT INTO public.users (id, email, first_name, last_name)
    VALUES (NEW.id, NEW.email, v_first_name, v_last_name);
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


-- ===================================
-- INDEXES FOR PERFORMANCE
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

-- ===================================
-- SETUP COMPLETE
-- ===================================