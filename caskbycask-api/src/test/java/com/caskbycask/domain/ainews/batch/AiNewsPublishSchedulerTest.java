package com.caskbycask.domain.ainews.batch;

import com.caskbycask.domain.ainews.entity.enums.AiNewsArticleStatus;
import com.caskbycask.domain.ainews.repository.AiNewsArticleRepository;
import com.caskbycask.domain.ainews.service.AiNewsService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AiNewsPublishSchedulerTest {

    @Mock AiNewsArticleRepository articleRepository;
    @Mock AiNewsService aiNewsService;

    @Test
    void publishesEveryDueArticleWithSameCutoffTime() {
        given(articleRepository.findDueScheduledIds(
                eq(AiNewsArticleStatus.SCHEDULED), any(LocalDateTime.class), any(Pageable.class)))
                .willReturn(List.of(10L, 20L));
        AiNewsPublishScheduler scheduler = new AiNewsPublishScheduler(articleRepository, aiNewsService);

        scheduler.publishDueArticles();

        ArgumentCaptor<LocalDateTime> cutoff = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(aiNewsService).publishScheduled(eq(10L), cutoff.capture());
        verify(aiNewsService).publishScheduled(eq(20L), cutoff.capture());
        assertThat(cutoff.getAllValues()).containsOnly(cutoff.getAllValues().getFirst());
    }
}
