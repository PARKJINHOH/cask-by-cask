package com.drinkindex.domain.community.dto;

import com.drinkindex.domain.community.entity.Post;
import com.drinkindex.domain.community.entity.Series;
import lombok.Getter;

@Getter
public class SeriesInfo {

    private final Long id;
    private final String title;
    private final Integer seriesOrder;
    private final int postCount;

    private SeriesInfo(Series series, Integer seriesOrder) {
        this.id          = series.getId();
        this.title       = series.getTitle();
        this.seriesOrder = seriesOrder;
        this.postCount   = series.getPostCount();
    }

    public static SeriesInfo from(Post post) {
        if (post.getSeries() == null) return null;
        return new SeriesInfo(post.getSeries(), post.getSeriesOrder());
    }
}
