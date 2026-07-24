create index idx_social_publication_published
    on social_publications (status, published_at, id);

create index idx_social_publication_stale
    on social_publications (status, updated_at, id);
