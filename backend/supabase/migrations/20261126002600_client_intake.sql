-- =============================================================================
-- Client registration from the website -> client record in the dashboard.
--
-- The "I need care" form now asks where care will happen (address or landmark,
-- Ghana Post digital address, and a map pin). The office turns a care request
-- into a client record in one step; the record remembers which request it came
-- from, so the same request can't create two clients.
-- =============================================================================

alter table public.care_clients
  add column address text check (char_length(address) <= 300),
  add column digital_address text check (digital_address ~ '^[A-Z]{2}-[0-9]{3,4}-[0-9]{4}$'),
  add column source_enquiry_id uuid unique references public.enquiries (id) on delete set null;

comment on column public.care_clients.address is 'House address or directions/landmarks for the care worker.';
comment on column public.care_clients.digital_address is 'Ghana Post GPS digital address, e.g. GA-123-4567.';
comment on column public.care_clients.source_enquiry_id is 'The website care request this client record was created from.';
