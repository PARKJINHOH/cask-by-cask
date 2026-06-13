package com.caskbycask.domain.community.dto;

import com.caskbycask.domain.community.entity.Post;
import com.caskbycask.domain.community.entity.Series;
import com.caskbycask.domain.community.entity.enums.BoardType;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Getter
public class SeriesDetailResponse {

    private final Long id;
    private final BoardType boardType;
    private final String title;
    private final String description;
    private final String authorNickname;
    private final int postCount;
    private final List<SeriesPostItem> posts;
    private final LocalDateTime createdAt;

    public SeriesDetailResponse(Series series, List<Post> posts) {
        this.id             = series.getId();
        this.boardType      = series.getBoardType();
        this.title          = series.getTitle();
        this.description    = series.getDescription();
        this.authorNickname = series.getAuthor().getNickname();
        this.postCount      = series.getPostCount();
        this.posts          = posts.stream().map(SeriesPostItem::from).collect(Collectors.toList());
        this.createdAt      = series.getCreatedAt();
    }
}
