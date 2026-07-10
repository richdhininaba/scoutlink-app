-- Keep the active Stratex admin/org records aligned with the live company structure.
-- Rodhin Junior Inaba / RJ Inaba has been removed from the active Stratex hierarchy.

delete from public.stratex_leadership_members
where lower(coalesce(email, '')) = 'rodhinjunior.inaba@stratexanalytics.co.uk'
   or lower(coalesce(full_name, '')) in ('rj inaba', 'rodhin inaba', 'rodhin junior inaba');

delete from public.stratex
where lower(coalesce(email, '')) = 'rodhinjunior.inaba@stratexanalytics.co.uk'
   or lower(trim(coalesce(first_name, '') || ' ' || coalesce(last_name, ''))) in ('rj inaba', 'rodhin inaba', 'rodhin junior inaba');
