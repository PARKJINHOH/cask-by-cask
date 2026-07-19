ALTER TABLE taste_trees
    ADD COLUMN moderation_status VARCHAR(20) NOT NULL DEFAULT 'VISIBLE' AFTER source_tree_id,
    ADD COLUMN created_by_user_id BIGINT NULL AFTER owner_user_id,
    ADD COLUMN like_count INT NOT NULL DEFAULT 0 AFTER moderation_status,
    ADD COLUMN view_count INT NOT NULL DEFAULT 0 AFTER like_count;

UPDATE taste_trees
SET created_by_user_id = owner_user_id
WHERE owner_user_id IS NOT NULL;

ALTER TABLE taste_trees
    ADD CONSTRAINT fk_taste_trees_created_by
        FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE SET NULL;

CREATE INDEX idx_taste_trees_public_sort
    ON taste_trees (moderation_status, tree_type, like_count, view_count);

CREATE TABLE taste_tree_likes (
    id BIGINT NOT NULL AUTO_INCREMENT,
    tree_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT ux_taste_tree_likes_tree_user UNIQUE (tree_id, user_id),
    CONSTRAINT fk_taste_tree_likes_tree FOREIGN KEY (tree_id) REFERENCES taste_trees (id) ON DELETE CASCADE,
    CONSTRAINT fk_taste_tree_likes_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_taste_tree_likes_user ON taste_tree_likes (user_id, created_at);

CREATE TABLE taste_tree_daily_views (
    id BIGINT NOT NULL AUTO_INCREMENT,
    tree_id BIGINT NOT NULL,
    viewer_key_hash CHAR(64) NOT NULL,
    viewed_date DATE NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT ux_taste_tree_daily_views UNIQUE (tree_id, viewer_key_hash, viewed_date),
    CONSTRAINT fk_taste_tree_daily_views_tree FOREIGN KEY (tree_id) REFERENCES taste_trees (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_taste_tree_daily_views_date ON taste_tree_daily_views (viewed_date);

ALTER TABLE taste_tree_images
    ADD COLUMN tree_id BIGINT NULL AFTER id,
    ADD CONSTRAINT fk_taste_tree_images_tree
        FOREIGN KEY (tree_id) REFERENCES taste_trees (id) ON DELETE CASCADE;

CREATE INDEX idx_taste_tree_images_tree ON taste_tree_images (tree_id);

UPDATE taste_trees
SET moderation_status = 'HIDDEN'
WHERE tree_type = 'OFFICIAL';

UPDATE taste_tree_versions v
JOIN taste_trees t ON t.id = v.tree_id
SET v.status = 'ARCHIVED'
WHERE t.tree_type = 'OFFICIAL' AND v.status = 'PUBLISHED';

DROP TABLE taste_tree_results;
