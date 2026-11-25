-- =============================================================================
-- Impact numbers and Recognition (accreditations, memberships, awards) for the
-- About page and homepage. Both start empty, and the website hides each section
-- until the owner enters real entries. Never publish figures that are not true.
--
-- impact_stats:  [{ "value": "500+", "label": "Families supported", "detail": "since 2020" }]
-- recognitions:  [{ "name": "Registered with …", "detail": "…", "year": "2025" }]
-- =============================================================================

alter table public.site_settings
  add column impact_stats jsonb not null default '[]'::jsonb
    constraint site_settings_impact_stats_array check (jsonb_typeof(impact_stats) = 'array'),
  add column recognitions jsonb not null default '[]'::jsonb
    constraint site_settings_recognitions_array check (jsonb_typeof(recognitions) = 'array');

comment on column public.site_settings.impact_stats is
  'Key figures shown on the homepage and About page, e.g. [{"value":"500+","label":"Families supported","detail":"since 2020"}]. Hidden when empty.';
comment on column public.site_settings.recognitions is
  'Accreditations, memberships and awards shown on the About page, e.g. [{"name":"…","detail":"…","year":"2025"}]. Hidden when empty.';
