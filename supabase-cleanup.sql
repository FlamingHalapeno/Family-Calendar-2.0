-- Drop all functions
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT
            'DROP ' || CASE WHEN p.prokind = 'p' THEN 'PROCEDURE' ELSE 'FUNCTION' END || 
            ' IF EXISTS public.' || p.proname || '(' || oidvectortypes(p.proargtypes) || ') CASCADE;' as drop_statement
        FROM 
            pg_proc p
        JOIN 
            pg_namespace n ON n.oid = p.pronamespace
        WHERE 
            n.nspname = 'public'
    ) LOOP
        EXECUTE r.drop_statement;
    END LOOP;
END $$;