package com.caskbycask.domain.community.dto;

import com.caskbycask.domain.community.entity.Post;
import com.caskbycask.domain.community.entity.enums.BoardType;
import com.caskbycask.domain.community.entity.enums.PostStatus;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Getter
public class PostDetailResponse {

    private static final String AI_SYSTEM_AUTHOR_EMAIL = "ai-news@system.caskbycask.local";
    private static final String NEWS_MANAGER_AUTHOR_NAME = "소식관리자";

    private final Long id;
    private final BoardType boardType;
    private final PrefixInfo prefix;
    private final String title;
    private final boolean isLocked;
    private final boolean isHidden;         // 관리자/모더레이터가 숨김 처리 (비관리자 내용 마스킹)
    private final boolean isPinned;         // 게시판 공지(고정글)
    private final boolean adultOnly;        // 성인 전용(주류 나눔 등) — 제목 19 아이콘
    private final String contentSanitized; // null if LOCKED and not admin
    private final String authorNickname;
    private final Long authorId;               // null if isAnonymous
    private final String authorRole;           // null if isAnonymous
    private final Integer authorLevel;         // null if isAnonymous
    private final Integer authorMaturingPower; // null if isAnonymous
    private final Boolean authorNicknameFixed; // null if isAnonymous
    private final String authorProfileImageUrl; // null if isAnonymous
    private final boolean authorSystemAccount;
    private final long viewCount;
    private final int likeCount;
    private final int commentCount;
    private final PollDetailResponse poll;
    private final List<PostImageInfo> images;
    private final List<String> sourceUrls;
    private final List<String> hashtags;
    /** 주류 태그 (이미지 갤러리 전용, 그 외 게시판은 빈 목록) */
    private final List<PostSpiritTagInfo> spiritTags;
    private final SeriesInfo series;
    private final Boolean isMyPost;   // null if not logged in
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
        this.isHidden         = b.isHidden;
        this.isPinned         = b.isPinned;
        this.adultOnly        = b.adultOnly;
        this.contentSanitized = b.contentSanitized;
        this.authorNickname      = b.authorNickname;
        this.authorId            = b.authorId;
        this.authorRole          = b.authorRole;
        this.authorLevel         = b.authorLevel;
        this.authorMaturingPower = b.authorMaturingPower;
        this.authorNicknameFixed   = b.authorNicknameFixed;
        this.authorProfileImageUrl = b.authorProfileImageUrl;
        this.authorSystemAccount = b.authorSystemAccount;
        this.viewCount        = b.viewCount;
        this.likeCount        = b.likeCount;
        this.commentCount     = b.commentCount;
        this.poll             = b.poll;
        this.images           = b.images;
        this.sourceUrls       = b.sourceUrls;
        this.hashtags         = b.hashtags;
        this.spiritTags       = b.spiritTags;
        this.series           = b.series;
        this.isMyPost         = b.isMyPost;
        this.isLiked          = b.isLiked;
        this.isScrapped       = b.isScrapped;
        this.isBlocked        = b.isBlocked;
        this.createdAt        = b.createdAt;
        this.updatedAt        = b.updatedAt;
    }

    public static Builder builder(Post post, boolean showContent) {
        boolean locked = PostStatus.LOCKED.equals(post.getStatus());
        boolean anonymous = Boolean.TRUE.equals(post.getIsAnonymous());
        boolean systemAccount = !anonymous
                && AI_SYSTEM_AUTHOR_EMAIL.equalsIgnoreCase(post.getAuthor().getEmail());
        return new Builder()
                .id(post.getId())
                .boardType(post.getBoardType())
                .prefix(post.getPrefix() != null ? PrefixInfo.from(post.getPrefix()) : null)
                .title(post.getTitle())
                .isLocked(locked)
                .isPinned(Boolean.TRUE.equals(post.getIsPinned()))
                .adultOnly(Boolean.TRUE.equals(post.getAdultOnly()))
                .contentSanitized(showContent ? post.getContentSanitized() : null)
                .authorNickname(anonymous ? "익명" : systemAccount
                        ? NEWS_MANAGER_AUTHOR_NAME : post.getAuthor().getNickname())
                .authorId(Boolean.TRUE.equals(post.getIsAnonymous()) ? null : post.getAuthor().getId())
                .authorRole(Boolean.TRUE.equals(post.getIsAnonymous()) ? null : post.getAuthor().getRole().name())
                .authorLevel(Boolean.TRUE.equals(post.getIsAnonymous()) ? null : post.getAuthor().getCurrentLevel())
                .authorMaturingPower(Boolean.TRUE.equals(post.getIsAnonymous()) ? null : post.getAuthor().getMaturingPower())
                .authorNicknameFixed(Boolean.TRUE.equals(post.getIsAnonymous()) ? null : post.getAuthor().getNicknameFixed())
                .authorProfileImageUrl(Boolean.TRUE.equals(post.getIsAnonymous()) ? null : post.getAuthor().getProfileImageUrl())
                .authorSystemAccount(systemAccount)
                .viewCount(post.getViewCount())
                .likeCount(post.getLikeCount())
                .commentCount(post.getCommentCount())
                .poll(post.getPoll() != null ? PollDetailResponse.from(post.getPoll()) : null)
                .images(post.getImages().stream().map(PostImageInfo::from).collect(Collectors.toList()))
                .hashtags(post.getHashtags())
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
        private boolean isHidden;
        private boolean isPinned;
        private boolean adultOnly;
        private String contentSanitized;
        private String authorNickname;
        private Long authorId;
        private String authorRole;
        private Integer authorLevel;
        private Integer authorMaturingPower;
        private Boolean authorNicknameFixed;
        private String authorProfileImageUrl;
        private boolean authorSystemAccount;
        private long viewCount;
        private int likeCount;
        private int commentCount;
        private PollDetailResponse poll;
        private List<PostImageInfo> images;
        private List<String> sourceUrls = List.of();
        private List<String> hashtags = List.of();
        private List<PostSpiritTagInfo> spiritTags = List.of();
        private SeriesInfo series;
        private Boolean isMyPost;
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
        public Builder isHidden(boolean h)                { this.isHidden = h; return this; }
        public Builder isPinned(boolean p)                { this.isPinned = p; return this; }
        public Builder adultOnly(boolean a)               { this.adultOnly = a; return this; }
        public Builder contentSanitized(String c)         { this.contentSanitized = c; return this; }
        public Builder authorNickname(String n)           { this.authorNickname = n; return this; }
        public Builder authorId(Long id)                  { this.authorId = id; return this; }
        public Builder authorRole(String r)               { this.authorRole = r; return this; }
        public Builder authorLevel(Integer l)             { this.authorLevel = l; return this; }
        public Builder authorMaturingPower(Integer m)     { this.authorMaturingPower = m; return this; }
        public Builder authorNicknameFixed(Boolean f)      { this.authorNicknameFixed = f; return this; }
        public Builder authorProfileImageUrl(String u)    { this.authorProfileImageUrl = u; return this; }
        public Builder authorSystemAccount(boolean s)      { this.authorSystemAccount = s; return this; }
        public Builder viewCount(long v)                  { this.viewCount = v; return this; }
        public Builder likeCount(int l)                   { this.likeCount = l; return this; }
        public Builder commentCount(int c)                { this.commentCount = c; return this; }
        public Builder poll(PollDetailResponse p)         { this.poll = p; return this; }
        public Builder images(List<PostImageInfo> i)      { this.images = i; return this; }
        public Builder sourceUrls(List<String> urls)      {
            this.sourceUrls = urls != null ? List.copyOf(urls) : List.of();
            return this;
        }
        public Builder hashtags(List<String> hashtags)    {
            this.hashtags = hashtags != null ? List.copyOf(hashtags) : List.of();
            return this;
        }
        public Builder spiritTags(List<PostSpiritTagInfo> tags) {
            this.spiritTags = tags != null ? List.copyOf(tags) : List.of();
            return this;
        }
        public Builder series(SeriesInfo s)               { this.series = s; return this; }
        public Builder isMyPost(Boolean m)                { this.isMyPost = m; return this; }
        public Builder isLiked(Boolean l)                 { this.isLiked = l; return this; }
        public Builder isScrapped(Boolean s)              { this.isScrapped = s; return this; }
        public Builder isBlocked(Boolean b)               { this.isBlocked = b; return this; }
        public Builder createdAt(LocalDateTime t)         { this.createdAt = t; return this; }
        public Builder updatedAt(LocalDateTime t)         { this.updatedAt = t; return this; }

        public PostDetailResponse build()                 { return new PostDetailResponse(this); }
    }
}
