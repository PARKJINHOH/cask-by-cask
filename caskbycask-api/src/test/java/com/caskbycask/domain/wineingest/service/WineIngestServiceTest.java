package com.caskbycask.domain.wineingest.service;

import com.caskbycask.domain.spirit.dto.WineDetailRequest;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.enums.*;
import com.caskbycask.domain.spirit.repository.SpiritRepository;
import com.caskbycask.domain.spirit.service.SpiritDetailService;
import com.caskbycask.domain.spirit.service.WineRegionService;
import com.caskbycask.domain.producer.entity.Producer;
import com.caskbycask.domain.producer.entity.ProducerType;
import com.caskbycask.domain.producer.repository.ProducerRepository;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.domain.wineingest.dto.WineIngestDtos;
import com.caskbycask.domain.wineingest.entity.SpiritExternalReference;
import com.caskbycask.domain.wineingest.entity.WineIngestItem;
import com.caskbycask.domain.wineingest.entity.WineIngestRun;
import com.caskbycask.domain.wineingest.entity.WineIngestSettings;
import com.caskbycask.domain.wineingest.entity.enums.*;
import com.caskbycask.domain.wineingest.repository.*;
import com.caskbycask.global.exception.CustomException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WineIngestServiceTest {
    @Mock WineIngestSettingsRepository settingsRepository;
    @Mock WineIngestRunRepository runRepository;
    @Mock WineIngestItemRepository itemRepository;
    @Mock SpiritExternalReferenceRepository externalReferenceRepository;
    @Mock SpiritRepository spiritRepository;
    @Mock ProducerRepository producerRepository;
    @Mock UserRepository userRepository;
    @Mock SpiritDetailService spiritDetailService;
    @Mock WineRegionService wineRegionService;
    @InjectMocks WineIngestService service;

    @Test
    void 자동수집이_꺼지면_예약작업은_취소하고_수동작업을_claim한다() {
        WineIngestRun scheduled = queuedRun("scheduled", WineIngestRunType.SCHEDULED);
        WineIngestRun manual = queuedRun("manual", WineIngestRunType.MANUAL);
        when(settingsRepository.findById(WineIngestSettings.SINGLETON_ID))
                .thenReturn(Optional.of(settings(false)));
        when(runRepository.findByStatusAndLastHeartbeatAtBefore(any(), any())).thenReturn(List.of());
        when(runRepository.findNextForUpdate(eq(WineIngestRunStatus.QUEUED), any(Pageable.class)))
                .thenReturn(List.of(scheduled, manual));

        var claimed = service.claimNextRun();

        assertThat(scheduled.getStatus()).isEqualTo(WineIngestRunStatus.CANCELLED);
        assertThat(scheduled.getErrorMessage()).contains("자동 수집이 꺼져");
        assertThat(claimed.runKey()).isEqualTo("manual");
        assertThat(manual.getStatus()).isEqualTo(WineIngestRunStatus.RUNNING);
    }

    @Test
    void 자동수집이_꺼져도_수동_Vivino_회차는_만들_수_있다() {
        when(settingsRepository.findByIdForUpdate(WineIngestSettings.SINGLETON_ID))
                .thenReturn(Optional.of(settings(false)));
        when(runRepository.sumRequestedLimitSince(any())).thenReturn(0L);
        when(runRepository.save(any(WineIngestRun.class))).thenAnswer(call -> call.getArgument(0));

        var run = service.createManualRun(
                new WineIngestDtos.ManualRunRequest(WineIngestRunType.MANUAL, 3), null);

        assertThat(run.runType()).isEqualTo(WineIngestRunType.MANUAL);
        assertThat(run.requestedLimit()).isEqualTo(3);
    }

    @Test
    void 국문명_검수후_마스터와_빈티지를_함께_공개한다() {
        Spirit master = Spirit.builder()
                .nameKo("샤토 테스트").nameEn("Chateau Test")
                .category(SpiritCategory.WINE).status(SpiritStatus.HIDDEN).build();
        Spirit child = Spirit.builder()
                .nameKo("Chateau Test").nameEn("Chateau Test")
                .category(SpiritCategory.WINE).status(SpiritStatus.HIDDEN).parent(master).build();
        WineIngestRun run = queuedRun("fixture", WineIngestRunType.FIXTURE);
        WineIngestItem item = WineIngestItem.builder()
                .run(run).status(WineIngestItemStatus.CREATED).provider("VIVINO").spirit(child).build();
        when(itemRepository.findWithSpiritById(1L)).thenReturn(Optional.of(item));

        var response = service.publishItem(1L);

        assertThat(master.getStatus()).isEqualTo(SpiritStatus.ACTIVE);
        assertThat(child.getStatus()).isEqualTo(SpiritStatus.ACTIVE);
        assertThat(child.getNameKo()).isEqualTo("샤토 테스트");
        assertThat(response.koreanNameReady()).isTrue();
        assertThat(response.published()).isTrue();
    }

    @Test
    void 수집한_와인은_마스터와_빈티지_모두_비공개로_저장한다() {
        WineIngestRun run = runningRun();
        Producer winery = Producer.builder().id(7L).type(ProducerType.WINERY).nameEn("Example Winery").build();
        when(runRepository.findByRunKey("live")).thenReturn(Optional.of(run));
        when(externalReferenceRepository.existsByProviderAndExternalWineIdAndExternalVintageId(any(), any(), any()))
                .thenReturn(false);
        when(producerRepository.findFirstByTypeAndNameEnIgnoreCase(ProducerType.WINERY, "Example Winery"))
                .thenReturn(Optional.of(winery));
        when(externalReferenceRepository.existsByIdentityKey(any())).thenReturn(false);
        when(spiritRepository.findExistingWineVintage(any(), any(), any(), anyBoolean())).thenReturn(List.of());
        when(spiritRepository.findFirstByCategoryAndProducerIdAndParentIsNullAndNameEnIgnoreCase(
                eq(SpiritCategory.WINE), eq(7L), any())).thenReturn(Optional.empty());
        when(spiritRepository.findByParentIdAndVariantValueIgnoreCaseAndStatusIn(any(), any(), any()))
                .thenReturn(List.of());
        when(spiritRepository.findByParentId(any())).thenReturn(List.of());
        List<Spirit> saved = new ArrayList<>();
        when(spiritRepository.save(any(Spirit.class))).thenAnswer(call -> {
            saved.add(call.getArgument(0));
            return call.getArgument(0);
        });
        when(itemRepository.save(any(WineIngestItem.class))).thenAnswer(call -> call.getArgument(0));

        var response = service.importWine("live", importRequest());

        assertThat(response.status()).isEqualTo(WineIngestItemStatus.CREATED);
        assertThat(saved).hasSize(2);
        assertThat(saved).allSatisfy(spirit ->
                assertThat(spirit.getStatus()).isEqualTo(SpiritStatus.HIDDEN));
        assertThat(response.published()).isFalse();
    }

    @Test
    void 이미_출처가_있는_마스터의_외부_스냅샷은_수집이_덮어쓰지_않는다() {
        WineIngestRun run = runningRun();
        Producer winery = Producer.builder().id(7L).type(ProducerType.WINERY).nameEn("Example Winery").build();
        Spirit master = Spirit.builder().nameKo("샤토 테스트").nameEn("Chateau Test")
                .category(SpiritCategory.WINE).status(SpiritStatus.ACTIVE).build();
        master.assignExternalSource("VIVINO", "https://www.vivino.com/curated/w/1",
                "https://images.vivino.com/curated.png", new BigDecimal("4.8"), 9999);
        when(runRepository.findByRunKey("live")).thenReturn(Optional.of(run));
        when(externalReferenceRepository.existsByProviderAndExternalWineIdAndExternalVintageId(any(), any(), any()))
                .thenReturn(false);
        when(producerRepository.findFirstByTypeAndNameEnIgnoreCase(ProducerType.WINERY, "Example Winery"))
                .thenReturn(Optional.of(winery));
        when(externalReferenceRepository.existsByIdentityKey(any())).thenReturn(false);
        when(spiritRepository.findExistingWineVintage(any(), any(), any(), anyBoolean())).thenReturn(List.of());
        when(spiritRepository.findFirstByCategoryAndProducerIdAndParentIsNullAndNameEnIgnoreCase(
                eq(SpiritCategory.WINE), eq(7L), any())).thenReturn(Optional.of(master));
        when(spiritRepository.findByParentIdAndVariantValueIgnoreCaseAndStatusIn(any(), any(), any()))
                .thenReturn(List.of());
        when(spiritRepository.findByParentId(any())).thenReturn(List.of());
        when(spiritRepository.save(any(Spirit.class))).thenAnswer(call -> call.getArgument(0));
        when(itemRepository.save(any(WineIngestItem.class))).thenAnswer(call -> call.getArgument(0));

        service.importWine("live", importRequest());

        assertThat(master.getSourceUrl()).isEqualTo("https://www.vivino.com/curated/w/1");
        assertThat(master.getSourceRating()).isEqualByComparingTo("4.8");
        assertThat(master.getSourceRatingCount()).isEqualTo(9999);
        assertThat(master.getStatus()).isEqualTo(SpiritStatus.ACTIVE);
    }

    @Test
    void 등록되지_않은_와이너리는_생산자_없이_비공개_저장하고_검수_사유를_남긴다() {
        WineIngestRun run = runningRun();
        when(runRepository.findByRunKey("live")).thenReturn(Optional.of(run));
        when(externalReferenceRepository.existsByProviderAndExternalWineIdAndExternalVintageId(any(), any(), any()))
                .thenReturn(false);
        when(producerRepository.findFirstByTypeAndNameEnIgnoreCase(ProducerType.WINERY, "Unknown Winery"))
                .thenReturn(Optional.empty());
        when(externalReferenceRepository.existsByIdentityKey(any())).thenReturn(false);
        when(spiritRepository.findExistingWineVintage(isNull(), any(), any(), anyBoolean())).thenReturn(List.of());
        when(externalReferenceRepository.findFirstByProviderAndExternalWineIdOrderByIdAsc("VIVINO", "123"))
                .thenReturn(Optional.empty());
        when(spiritRepository.findByParentIdAndVariantValueIgnoreCaseAndStatusIn(any(), any(), any()))
                .thenReturn(List.of());
        when(spiritRepository.findByParentId(any())).thenReturn(List.of());
        List<Spirit> saved = new ArrayList<>();
        when(spiritRepository.save(any(Spirit.class))).thenAnswer(call -> {
            saved.add(call.getArgument(0));
            return call.getArgument(0);
        });
        when(itemRepository.save(any(WineIngestItem.class))).thenAnswer(call -> call.getArgument(0));

        var response = service.importWine("live", importRequest("Unknown Winery"));

        assertThat(response.status()).isEqualTo(WineIngestItemStatus.CREATED);
        assertThat(response.reasonCode()).isEqualTo("PRODUCER_UNRESOLVED");
        assertThat(response.reasonMessage()).contains("Unknown Winery");
        assertThat(saved).hasSize(2);
        assertThat(saved).allSatisfy(spirit -> {
            assertThat(spirit.getProducer()).isNull();
            assertThat(spirit.getStatus()).isEqualTo(SpiritStatus.HIDDEN);
        });
    }

    @Test
    void 원문에_와이너리가_없어도_수집을_실패시키지_않는다() {
        WineIngestRun run = runningRun();
        when(runRepository.findByRunKey("live")).thenReturn(Optional.of(run));
        when(externalReferenceRepository.existsByProviderAndExternalWineIdAndExternalVintageId(any(), any(), any()))
                .thenReturn(false);
        when(externalReferenceRepository.existsByIdentityKey(any())).thenReturn(false);
        when(spiritRepository.findExistingWineVintage(isNull(), any(), any(), anyBoolean())).thenReturn(List.of());
        when(externalReferenceRepository.findFirstByProviderAndExternalWineIdOrderByIdAsc("VIVINO", "123"))
                .thenReturn(Optional.empty());
        when(spiritRepository.findByParentIdAndVariantValueIgnoreCaseAndStatusIn(any(), any(), any()))
                .thenReturn(List.of());
        when(spiritRepository.findByParentId(any())).thenReturn(List.of());
        when(spiritRepository.save(any(Spirit.class))).thenAnswer(call -> call.getArgument(0));
        when(itemRepository.save(any(WineIngestItem.class))).thenAnswer(call -> call.getArgument(0));

        var response = service.importWine("live", importRequest(null));

        assertThat(response.status()).isEqualTo(WineIngestItemStatus.CREATED);
        assertThat(response.reasonCode()).isEqualTo("PRODUCER_UNRESOLVED");
        verify(producerRepository, never()).findFirstByTypeAndNameEnIgnoreCase(any(), any());
    }

    @Test
    void 생산자를_모르면_같은_외부_와인의_기존_마스터에_빈티지를_붙인다() {
        WineIngestRun run = runningRun();
        Spirit master = Spirit.builder().nameKo("Chateau Test").nameEn("Chateau Test")
                .category(SpiritCategory.WINE).status(SpiritStatus.HIDDEN).build();
        Spirit priorVintage = Spirit.builder().nameEn("Chateau Test")
                .category(SpiritCategory.WINE).status(SpiritStatus.HIDDEN).parent(master).build();
        when(runRepository.findByRunKey("live")).thenReturn(Optional.of(run));
        when(externalReferenceRepository.existsByProviderAndExternalWineIdAndExternalVintageId(any(), any(), any()))
                .thenReturn(false);
        when(externalReferenceRepository.existsByIdentityKey(any())).thenReturn(false);
        when(spiritRepository.findExistingWineVintage(isNull(), any(), any(), anyBoolean())).thenReturn(List.of());
        when(externalReferenceRepository.findFirstByProviderAndExternalWineIdOrderByIdAsc("VIVINO", "123"))
                .thenReturn(Optional.of(SpiritExternalReference.builder().spirit(priorVintage).build()));
        when(spiritRepository.findByParentIdAndVariantValueIgnoreCaseAndStatusIn(any(), any(), any()))
                .thenReturn(List.of());
        when(spiritRepository.findByParentId(any())).thenReturn(List.of());
        List<Spirit> saved = new ArrayList<>();
        when(spiritRepository.save(any(Spirit.class))).thenAnswer(call -> {
            saved.add(call.getArgument(0));
            return call.getArgument(0);
        });
        when(itemRepository.save(any(WineIngestItem.class))).thenAnswer(call -> call.getArgument(0));

        service.importWine("live", importRequest(null));

        assertThat(saved).hasSize(1);  // 마스터를 새로 만들지 않고 기존 마스터에 붙인다
        assertThat(saved.get(0).getParent()).isSameAs(master);
    }

    @Test
    void 요청_상한을_모두_채운_회차도_정상_마감된다() {
        WineIngestRun run = runningRun();
        for (int i = 0; i < run.getRequestedLimit(); i++) run.record(WineIngestItemStatus.CREATED);
        when(runRepository.findByRunKey("live")).thenReturn(Optional.of(run));

        var response = service.finishRun("live", new WineIngestDtos.FinishRunRequest(null));

        assertThat(response.status()).isEqualTo(WineIngestRunStatus.SUCCEEDED);
        assertThat(run.getFinishedAt()).isNotNull();
        assertThat(run.getErrorMessage()).isNull();
    }

    @Test
    void 이미_끝난_회차는_다시_마감하지_않는다() {
        WineIngestRun run = runningRun();
        run.finish(null);
        when(runRepository.findByRunKey("live")).thenReturn(Optional.of(run));

        assertThatThrownBy(() -> service.finishRun("live", new WineIngestDtos.FinishRunRequest(null)))
                .isInstanceOf(CustomException.class);
    }

    @Test
    void 요청_상한을_넘는_건별_기록은_거부한다() {
        WineIngestRun run = runningRun();
        for (int i = 0; i < run.getRequestedLimit(); i++) run.record(WineIngestItemStatus.CREATED);
        when(runRepository.findByRunKey("live")).thenReturn(Optional.of(run));

        assertThatThrownBy(() -> service.recordFailure("live", new WineIngestDtos.FailureItemRequest(
                "VIVINO", null, null, null, "Chateau Test", null, "2020",
                WineIngestItemStatus.NOT_FOUND_SKIPPED, "CANDIDATE_NOT_FOUND", "수집 후보 없음")))
                .isInstanceOf(CustomException.class);
    }

    private static WineIngestDtos.WineImportRequest importRequest() {
        return importRequest("Example Winery");
    }

    private static WineIngestDtos.WineImportRequest importRequest(String producerNameEn) {
        WineDetailRequest detail = new WineDetailRequest(
                WineType.RED, WineVintageStatus.VINTAGE, null, null, null, List.of(),
                null, null, null, null, null, null, null,
                WineSweetness.DRY, WineBody.MEDIUM, WineIntensity.HIGH, WineIntensity.MEDIUM, null);
        return new WineIngestDtos.WineImportRequest(
                "VIVINO", "123", "9001", "https://www.vivino.com/US/en/example/w/123?year=2020",
                "https://images.vivino.com/example.png",
                "Chateau Test", producerNameEn, "France", "Bordeaux", null,
                WineVintageStatus.VINTAGE, 2020, new BigDecimal("13.5"), 750, detail,
                new BigDecimal("4.3"), 1200);
    }

    private static WineIngestRun runningRun() {
        WineIngestRun run = WineIngestRun.builder()
                .runKey("live").runType(WineIngestRunType.MANUAL)
                .status(WineIngestRunStatus.QUEUED).requestedLimit(3).build();
        run.start();
        return run;
    }

    private static WineIngestRun queuedRun(String key, WineIngestRunType type) {
        return WineIngestRun.builder()
                .runKey(key).runType(type).status(WineIngestRunStatus.QUEUED).requestedLimit(3).build();
    }

    private static WineIngestSettings settings(boolean automationEnabled) {
        return WineIngestSettings.builder()
                .id(WineIngestSettings.SINGLETON_ID)
                .automationEnabled(automationEnabled)
                .hourlyLimit(10)
                .maxRunItems(3)
                .slackAlertEnabled(true)
                .build();
    }
}
