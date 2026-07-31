package com.caskbycask.domain.review.dto;

import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.EnumMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class UserReviewCategoryCountResponseTest {

    @Test
    @DisplayName("누락된 카테고리는 0으로 채우고 total 은 전체 합계로 계산한다")
    void fillsMissingCategoriesAndSumsTotal() {
        Map<SpiritCategory, Long> partial = new EnumMap<>(SpiritCategory.class);
        partial.put(SpiritCategory.WHISKY, 3L);
        partial.put(SpiritCategory.WINE, 2L);

        UserReviewCategoryCountResponse response = UserReviewCategoryCountResponse.from(partial);

        assertThat(response.counts()).hasSize(SpiritCategory.values().length);
        assertThat(response.counts().get(SpiritCategory.WHISKY)).isEqualTo(3L);
        assertThat(response.counts().get(SpiritCategory.WINE)).isEqualTo(2L);
        assertThat(response.counts().get(SpiritCategory.COGNAC)).isZero();
        assertThat(response.counts().get(SpiritCategory.OTHER)).isZero();
        assertThat(response.total()).isEqualTo(5L);
    }

    @Test
    @DisplayName("집계가 없으면 모든 카테고리 0, total 0 을 반환한다")
    void handlesNullAndEmptyCounts() {
        assertThat(UserReviewCategoryCountResponse.from(null).total()).isZero();
        assertThat(UserReviewCategoryCountResponse.from(Map.of()).total()).isZero();
        assertThat(UserReviewCategoryCountResponse.from(Map.of()).counts().values())
                .hasSize(SpiritCategory.values().length)
                .allMatch(count -> count == 0L);
    }
}
