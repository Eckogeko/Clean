-- Add 'owner' to the role check constraint for team_members
ALTER TABLE public.team_members
DROP CONSTRAINT IF EXISTS team_members_role_check;

ALTER TABLE public.team_members
ADD CONSTRAINT team_members_role_check
CHECK (role = ANY (ARRAY['owner'::text, 'director'::text, 'dancer'::text]));

-- Update existing team creators to be owners instead of directors
UPDATE public.team_members tm
SET role = 'owner'
FROM public.teams t
WHERE tm.team_id = t.id
  AND tm.user_id = t.created_by
  AND tm.role = 'director';
