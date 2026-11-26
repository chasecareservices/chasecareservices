-- =============================================================================
-- Email alerts: the website emails the office about new enquiries and about
-- care reports with a concern. Who receives them is kept in
-- notification_recipients (topics 'enquiry.all', 'enquiry.<type>', 'care.concerns'),
-- edited in Site settings. With no recipients, alerts go to the site's email.
-- =============================================================================

-- When the office was emailed about an enquiry, so each enquiry is announced once.
alter table public.enquiries add column if not exists notified_at timestamptz;
comment on column public.enquiries.notified_at is 'When the office was emailed about this enquiry (set by the website server).';
