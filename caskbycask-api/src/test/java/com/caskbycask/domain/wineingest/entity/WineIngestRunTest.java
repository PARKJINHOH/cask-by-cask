package com.caskbycask.domain.wineingest.entity;

import com.caskbycask.domain.wineingest.entity.enums.WineIngestItemStatus;
import com.caskbycask.domain.wineingest.entity.enums.WineIngestRunStatus;
import com.caskbycask.domain.wineingest.entity.enums.WineIngestRunType;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class WineIngestRunTest {

    @Test
    void 실행전오류는_처리건이_없어도_실패다() {
        WineIngestRun run = runningRun();

        run.finish("license gate closed");

        assertThat(run.getStatus()).isEqualTo(WineIngestRunStatus.FAILED);
        assertThat(run.getFinishedAt()).isNotNull();
    }

    @Test
    void 일부등록후_오류로_끝나면_부분실패다() {
        WineIngestRun run = runningRun();
        run.record(WineIngestItemStatus.CREATED);

        run.finish("provider timeout");

        assertThat(run.getStatus()).isEqualTo(WineIngestRunStatus.PARTIAL);
    }

    @Test
    void 중복_PASS만_있으면_정상종료다() {
        WineIngestRun run = runningRun();
        run.record(WineIngestItemStatus.DUPLICATE_SKIPPED);

        run.finish(null);

        assertThat(run.getStatus()).isEqualTo(WineIngestRunStatus.SUCCEEDED);
        assertThat(run.getDuplicateCount()).isEqualTo(1);
    }

    @Test
    void 자료부족_PASS만_있으면_부분실패다() {
        WineIngestRun run = runningRun();
        run.record(WineIngestItemStatus.NOT_FOUND_SKIPPED);

        run.finish(null);

        assertThat(run.getStatus()).isEqualTo(WineIngestRunStatus.PARTIAL);
        assertThat(run.getSkippedCount()).isEqualTo(1);
    }

    @Test
    void 취소사유를_실행이력에_남긴다() {
        WineIngestRun run = runningRun();

        run.cancel("LIVE gate closed");

        assertThat(run.getStatus()).isEqualTo(WineIngestRunStatus.CANCELLED);
        assertThat(run.getErrorMessage()).isEqualTo("LIVE gate closed");
    }

    private static WineIngestRun runningRun() {
        WineIngestRun run = WineIngestRun.builder()
                .runKey("test-run")
                .runType(WineIngestRunType.FIXTURE)
                .status(WineIngestRunStatus.QUEUED)
                .requestedLimit(3)
                .build();
        run.start();
        return run;
    }
}
