package com.caskbycask.domain.community.dto;

import com.caskbycask.domain.community.entity.Post;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class SeriesPostItem {

    private final Long id;
    private final String title;
    private final Integer seriesOrder;
    private final int likeCount;
    private final int commentCount;
    private final LocalDateTime createdAt;

    private SeriesPostItem(Post post) {
        this.id          = post.getId();
        this.title       = post.getTitle();
        this.seriesOrder = post.getSeriesOrder();
        this.likeCount   = post.getLikeCount();
        this.commentCount = post.getCommentCount();
        this.createdAt   = post.getCreatedAt();
    }

    public static SeriesPostItem from(Post post) {
        return new SeriesPostItem(post);
    }
}
