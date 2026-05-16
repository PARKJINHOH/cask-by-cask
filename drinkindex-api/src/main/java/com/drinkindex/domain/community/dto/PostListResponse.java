package com.drinkindex.domain.community.dto;

import com.drinkindex.domain.community.entity.Post;
import com.drinkindex.domain.community.entity.enums.BoardType;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class PostListResponse {

    private final Long id;
    private final BoardType boardType;
    private final PrefixInfo prefix;
    private final String title;
    private final boolean isLocked;
    private final String authorNickname;
    private final long viewCount;
    private final int likeCount;
    private final int commentCount;
    private final boolean hasPoll;
    private final LocalDateTime createdAt;

    private PostListResponse(Post post) {
        this.id            = post.getId();
        this.boardType     = post.getBoardType();
        this.prefix        = post.getPrefix() != null ? PrefixInfo.from(post.getPrefix()) : null;
        this.title         = post.getTitle();
        this.isLocked      = post.getStatus() != null && post.getStatus().name().equals("LOCKED");
        this.authorNickname = Boolean.TRUE.equals(post.getIsAnonymous()) ? "익명" : post.getAuthor().getNickname();
        this.viewCount     = post.getViewCount();
        this.likeCount     = post.getLikeCount();
        this.commentCount  = post.getCommentCount();
        this.hasPoll       = post.getPoll() != null;
        this.createdAt     = post.getCreatedAt();
    }

    public static PostListResponse from(Post post) {
        return new PostListResponse(post);
    }
}
