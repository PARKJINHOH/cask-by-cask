package com.caskbycask.domain.community.dto;

import com.caskbycask.domain.community.entity.Post;
import com.caskbycask.domain.community.entity.enums.BoardType;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class PostListResponse {

    private final Long id;
    private final BoardType boardType;
    private final PrefixInfo prefix;
    private final String title;
    private final boolean isLocked;
    private final boolean isPinned;       // 게시판 공지(고정글)
    private final boolean adultOnly;      // 성인 전용(주류 나눔 등) — 제목 19 아이콘
    private final String authorNickname;
    private final String authorRole;           // null if anonymous
    private final Integer authorLevel;         // null if anonymous
    private final Integer authorMaturingPower; // null if anonymous
    private final Boolean authorNicknameFixed; // null if anonymous
    private final String authorProfileImageUrl; // null if anonymous
    private final Long authorId;               // null if anonymous
    private final long viewCount;
    private final int likeCount;
    private final int commentCount;
    private final boolean hasPoll;
    private final String thumbnailImageUrl;
    private final String thumbnailVideoUrl;
    // [패치 9] 소식 게시판 증류소 태그 (없으면 null)
    private final Long distilleryTagId;
    private final String distilleryTagNameKo;
    private final String distilleryTagNameEn;
    private final LocalDateTime createdAt;

    private PostListResponse(Post post, String thumbnailImageUrl, String thumbnailVideoUrl) {
        this.id            = post.getId();
        this.boardType     = post.getBoardType();
        this.prefix        = post.getPrefix() != null ? PrefixInfo.from(post.getPrefix()) : null;
        this.title         = post.getTitle();
        boolean locked     = post.getStatus() != null && post.getStatus().name().equals("LOCKED");
        this.isLocked      = locked;
        this.isPinned      = Boolean.TRUE.equals(post.getIsPinned());
        this.adultOnly     = Boolean.TRUE.equals(post.getAdultOnly());
        boolean anon       = Boolean.TRUE.equals(post.getIsAnonymous());
        this.authorNickname      = anon ? "익명" : post.getAuthor().getNickname();
        this.authorRole          = anon ? null : post.getAuthor().getRole().name();
        this.authorLevel         = anon ? null : post.getAuthor().getCurrentLevel();
        this.authorMaturingPower = anon ? null : post.getAuthor().getMaturingPower();
        this.authorNicknameFixed    = anon ? null : post.getAuthor().getNicknameFixed();
        this.authorProfileImageUrl  = anon ? null : post.getAuthor().getProfileImageUrl();
        this.authorId               = anon ? null : post.getAuthor().getId();
        this.viewCount     = post.getViewCount();
        this.likeCount     = post.getLikeCount();
        this.commentCount  = post.getCommentCount();
        this.hasPoll       = post.getPoll() != null;
        boolean exposeThumbnail = !locked && !this.adultOnly;
        this.thumbnailImageUrl = exposeThumbnail ? thumbnailImageUrl : null;
        this.thumbnailVideoUrl = exposeThumbnail && this.thumbnailImageUrl == null ? thumbnailVideoUrl : null;
        // [패치 9] 소식 게시판 증류소 태그
        this.distilleryTagId     = post.getDistilleryTag() != null ? post.getDistilleryTag().getId() : null;
        this.distilleryTagNameKo = post.getDistilleryTag() != null ? post.getDistilleryTag().getNameKo() : null;
        this.distilleryTagNameEn = post.getDistilleryTag() != null ? post.getDistilleryTag().getNameEn() : null;
        this.createdAt     = post.getCreatedAt();
    }

    public static PostListResponse from(Post post) {
        return new PostListResponse(post, null, null);
    }

    public static PostListResponse from(Post post, String thumbnailImageUrl) {
        return new PostListResponse(post, thumbnailImageUrl, null);
    }

    public static PostListResponse from(Post post, String thumbnailImageUrl, String thumbnailVideoUrl) {
        return new PostListResponse(post, thumbnailImageUrl, thumbnailVideoUrl);
    }
}
