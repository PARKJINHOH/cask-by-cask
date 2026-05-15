package com.drinkindex.domain.community.dto;

import com.drinkindex.domain.community.entity.Post;
import com.drinkindex.domain.community.entity.enums.BoardType;
import com.drinkindex.domain.community.entity.enums.PostStatus;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Getter
public class PostDetailResponse {

    private final Long id;
    private final BoardType boardType;
    private final PrefixInfo prefix;
    private final String title;
    private final boolean isLocked;
    private final String contentSanitized; // null if LOCKED and not admin
    private final String authorNickname;
    private final Long authorId;           // null if isAnonymous
    private final long viewCount;
    private final int likeCount;
    private final int dislikeCount;
    private final int commentCount;
    private final PollDetailResponse poll;
    private final List<PostImageInfo> images;
    private final SeriesInfo series;
    private final Boolean isLiked;    // null if not logged in
    private final Boolean isScrapped; // null if not logged in
    private final Boolean isBlocked;  // null if not logged in
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;

    private PostDetailResponse(Builder b) {
        this.id               = b.id;
        this.boardType        = b.boardType;
        this.prefix           = b.prefix;
        this.title            = b.title;
        this.isLocked         = b.isLocked;
        this.contentSanitized = b.contentSanitized;
        this.authorNickname   = b.authorNickname;
        this.authorId         = b.authorId;
        this.viewCount        = b.viewCount;
        this.likeCount        = b.likeCount;
        this.dislikeCount     = b.dislikeCount;
        this.commentCount     = b.commentCount;
        this.poll             = b.poll;
        this.images           = b.images;
        this.series           = b.series;
        this.isLiked          = b.isLiked;
        this.isScrapped       = b.isScrapped;
        this.isBlocked        = b.isBlocked;
        this.createdAt        = b.createdAt;
        this.updatedAt        = b.updatedAt;
    }

    public static Builder builder(Post post, boolean showContent) {
        boolean locked = PostStatus.LOCKED.equals(post.getStatus());
        return new Builder()
                .id(post.getId())
                .boardType(post.getBoardType())
                .prefix(post.getPrefix() != null ? PrefixInfo.from(post.getPrefix()) : null)
                .title(post.getTitle())
                .isLocked(locked)
                .contentSanitized(showContent ? post.getContentSanitized() : null)
                .authorNickname(Boolean.TRUE.equals(post.getIsAnonymous()) ? "익명" : post.getAuthor().getNickname())
                .authorId(Boolean.TRUE.equals(post.getIsAnonymous()) ? null : post.getAuthor().getId())
                .viewCount(post.getViewCount())
                .likeCount(post.getLikeCount())
                .dislikeCount(post.getDislikeCount())
                .commentCount(post.getCommentCount())
                .poll(post.getPoll() != null ? PollDetailResponse.from(post.getPoll()) : null)
                .images(post.getImages().stream().map(PostImageInfo::from).collect(Collectors.toList()))
                .series(SeriesInfo.from(post))
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt());
    }

    public static class Builder {
        private Long id;
        private BoardType boardType;
        private PrefixInfo prefix;
        private String title;
        private boolean isLocked;
        private String contentSanitized;
        private String authorNickname;
        private Long authorId;
        private long viewCount;
        private int likeCount;
        private int dislikeCount;
        private int commentCount;
        private PollDetailResponse poll;
        private List<PostImageInfo> images;
        private SeriesInfo series;
        private Boolean isLiked;
        private Boolean isScrapped;
        private Boolean isBlocked;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;

        public Builder id(Long id)                        { this.id = id; return this; }
        public Builder boardType(BoardType bt)            { this.boardType = bt; return this; }
        public Builder prefix(PrefixInfo p)               { this.prefix = p; return this; }
        public Builder title(String t)                    { this.title = t; return this; }
        public Builder isLocked(boolean l)                { this.isLocked = l; return this; }
        public Builder contentSanitized(String c)         { this.contentSanitized = c; return this; }
        public Builder authorNickname(String n)           { this.authorNickname = n; return this; }
        public Builder authorId(Long id)                  { this.authorId = id; return this; }
        public Builder viewCount(long v)                  { this.viewCount = v; return this; }
        public Builder likeCount(int l)                   { this.likeCount = l; return this; }
        public Builder dislikeCount(int d)                { this.dislikeCount = d; return this; }
        public Builder commentCount(int c)                { this.commentCount = c; return this; }
        public Builder poll(PollDetailResponse p)         { this.poll = p; return this; }
        public Builder images(List<PostImageInfo> i)      { this.images = i; return this; }
        public Builder series(SeriesInfo s)               { this.series = s; return this; }
        public Builder isLiked(Boolean l)                 { this.isLiked = l; return this; }
        public Builder isScrapped(Boolean s)              { this.isScrapped = s; return this; }
        public Builder isBlocked(Boolean b)               { this.isBlocked = b; return this; }
        public Builder createdAt(LocalDateTime t)         { this.createdAt = t; return this; }
        public Builder updatedAt(LocalDateTime t)         { this.updatedAt = t; return this; }

        public PostDetailResponse build()                 { return new PostDetailResponse(this); }
    }
}
