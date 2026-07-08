-- ScoutLink / Stratex migration v3.36
-- Stratex Admin Centre public leadership image asset URLs.

update public.stratex_leadership_members
set image_url = '/images/leadership/richdhin-inaba.jpg',
    updated_at = now()
where lower(full_name) = 'richdhin inaba'
   or lower(email) = 'richdhin@stratexanalytics.co.uk';

update public.stratex_leadership_members
set image_url = '/images/leadership/lucy-ali.jpg',
    updated_at = now()
where lower(full_name) = 'lucy ali'
   or lower(email) = 'lucy.ali@stratexanalytics.co.uk';

update public.stratex_leadership_members
set image_url = '/images/leadership/alexandro-ilioaie.jpg',
    updated_at = now()
where lower(full_name) = 'alexandro ilioaie'
   or lower(email) = 'alexandro.ilioaie@stratexanalytics.co.uk';

notify pgrst, 'reload schema';
