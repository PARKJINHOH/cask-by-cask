package com.caskbycask.domain.ainews.dto;

import jakarta.validation.constraints.Size;
import org.junit.jupiter.api.Test;

import java.lang.reflect.RecordComponent;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class AiNewsDtosValidationTest {

    @Test
    void allArticleRequestsAllowTitlesUpToSeventyCharacters() {
        List.of(
                AiNewsDtos.ArticleUpsertRequest.class,
                AiNewsDtos.ArticleAdminUpdateRequest.class,
                AiNewsDtos.RewriteResultRequest.class,
                AiNewsDtos.DuplicateSkipRequest.class
        ).forEach(requestType -> {
            RecordComponent title = findTitleComponent(requestType);

            assertThat(title.getAccessor().getAnnotation(Size.class).max())
                    .as("%s title max length", requestType.getSimpleName())
                    .isEqualTo(AiNewsDtos.ARTICLE_TITLE_MAX_LENGTH);
        });
    }

    private RecordComponent findTitleComponent(Class<?> requestType) {
        return List.of(requestType.getRecordComponents()).stream()
                .filter(component -> component.getName().equals("title"))
                .findFirst()
                .orElseThrow();
    }
}
