package com.drinkindex.domain.community.dto;

import com.drinkindex.domain.community.entity.Series;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class SeriesResponse {

    private final Long id;
    private final String title;
    private final String description;
    private final String authorNickname;
    private final int postCount;
    private final LocalDateTime createdAt;

    private SeriesResponse(Series series) {
        this.id             = series.getId();
        this.title          = series.getTitle();
        this.description    = series.getDescription();
        this.authorNickname = series.getAuthor().getNickname();
        this.postCount      = series.getPostCount();
        this.createdAt      = series.getCreatedAt();
    }

    public static SeriesResponse from(Series series) {
        return new SeriesResponse(series);
    }
}
