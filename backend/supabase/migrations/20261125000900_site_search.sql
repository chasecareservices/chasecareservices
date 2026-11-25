-- =============================================================================
-- Site-wide search for the public website.
-- search_site() runs with the caller's rights (security invoker), so Row Level
-- Security applies: visitors only ever find published content.
-- Partial words match ("eld" finds "Elderly Care"); results are ranked with
-- titles counting most, then summaries, then body text.
-- =============================================================================

create function public.search_site(query text, max_results integer default 30)
returns table (kind text, title text, summary text, url text, rank real)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  ts tsquery;
  tokens text[];
  phrase text;
begin
  -- Keep letters/numbers only, so user input can never break the query syntax.
  select array_agg(t) into tokens
  from (
    select t
    from unnest(regexp_split_to_array(lower(regexp_replace(coalesce(query, ''), '[^[:alnum:]]+', ' ', 'g')), '\s+')) as t
    where char_length(t) >= 2
    limit 8
  ) words;

  if tokens is null then
    return;
  end if;

  phrase := array_to_string(tokens, ' ');

  -- Every word must match; each word also matches longer words starting with it.
  ts := to_tsquery('english', array_to_string(array(select t || ':*' from unnest(tokens) as t), ' & '));
  max_results := least(greatest(coalesce(max_results, 30), 1), 50);

  return query
  with docs as (
    select
      'service'::text as kind,
      s.name as title,
      s.summary,
      case s.service_group
        when 'care' then '/care-services/'
        when 'diaspora' then '/diaspora/'
        when 'respite' then '/respite/'
        else '/care-services/'
      end || s.slug as url,
      setweight(to_tsvector('english', s.name), 'A')
        || setweight(to_tsvector('english', coalesce(s.summary, '')), 'B')
        || setweight(to_tsvector('english', coalesce(s.description, '') || ' ' || array_to_string(s.includes, ' ') || ' ' || coalesce(s.audience, '')), 'C') as doc
    from public.services s
    where s.status = 'published'

    union all
    select
      'course', c.title, c.summary, '/academy/' || c.slug,
      setweight(to_tsvector('english', c.title), 'A')
        || setweight(to_tsvector('english', coalesce(c.summary, '') || ' ' || coalesce(c.category, '')), 'B')
        || setweight(jsonb_to_tsvector('english', c.description, '["string"]') || to_tsvector('english', array_to_string(c.learning_outcomes, ' ')), 'C')
    from public.courses c
    where c.status = 'published'

    union all
    select
      'article', p.title, p.excerpt, '/journal/' || p.slug,
      setweight(to_tsvector('english', p.title), 'A')
        || setweight(to_tsvector('english', coalesce(p.excerpt, '') || ' ' || array_to_string(p.tags, ' ')), 'B')
        || setweight(jsonb_to_tsvector('english', p.body, '["string"]'), 'C')
    from public.posts p
    where p.status = 'published' and p.published_at <= now()

    union all
    select
      'page', pg.title, pg.summary, case when pg.slug = 'home' then '/' else '/' || pg.slug end,
      setweight(to_tsvector('english', pg.title), 'A')
        || setweight(to_tsvector('english', coalesce(pg.summary, '')), 'B')
        || setweight(jsonb_to_tsvector('english', pg.body, '["string"]'), 'C')
    from public.pages pg
    where pg.status = 'published'

    union all
    select
      'product', pr.name, pr.description, '/shop',
      setweight(to_tsvector('english', pr.name), 'A')
        || setweight(to_tsvector('english', coalesce(pr.description, '')), 'B')
    from public.products pr
    where pr.status = 'published'
  )
  select
    d.kind, d.title, d.summary, d.url,
    -- Text relevance (favouring shorter documents), plus a boost when the title
    -- is, or starts with, exactly what was typed.
    (
      ts_rank(d.doc, ts, 1)
      + case
          when lower(d.title) = phrase then 2
          -- Closer to the whole title = bigger boost ("Elderly Care" beats "Elderly Care for Diaspora Families").
          when lower(d.title) like phrase || '%' then 1 + char_length(phrase)::real / char_length(d.title)
          else 0
        end
    )::real as rank
  from docs d
  where d.doc @@ ts
  order by rank desc, d.title
  limit max_results;
end;
$$;

comment on function public.search_site(text, integer) is
  'Public site search across services, courses, articles, pages and products. Respects RLS (published content only).';

revoke all on function public.search_site(text, integer) from public;
grant execute on function public.search_site(text, integer) to anon, authenticated;
