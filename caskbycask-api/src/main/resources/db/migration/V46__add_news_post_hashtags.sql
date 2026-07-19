CREATE TABLE post_hashtags (
    post_id BIGINT NOT NULL,
    sort_order INT NOT NULL,
    hashtag VARCHAR(30) NOT NULL,
    PRIMARY KEY (post_id, sort_order),
    CONSTRAINT uk_post_hashtags_value UNIQUE (post_id, hashtag),
    CONSTRAINT fk_post_hashtags_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ai_news_article_hashtags (
    article_id BIGINT NOT NULL,
    sort_order INT NOT NULL,
    hashtag VARCHAR(30) NOT NULL,
    PRIMARY KEY (article_id, sort_order),
    CONSTRAINT uk_ai_news_article_hashtags_value UNIQUE (article_id, hashtag),
    CONSTRAINT fk_ai_news_article_hashtags_article FOREIGN KEY (article_id) REFERENCES ai_news_articles (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE deleted_post_hashtags (
    deleted_post_id BIGINT NOT NULL,
    sort_order INT NOT NULL,
    hashtag VARCHAR(30) NOT NULL,
    PRIMARY KEY (deleted_post_id, sort_order),
    CONSTRAINT uk_deleted_post_hashtags_value UNIQUE (deleted_post_id, hashtag),
    CONSTRAINT fk_deleted_post_hashtags_post FOREIGN KEY (deleted_post_id) REFERENCES deleted_posts (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
