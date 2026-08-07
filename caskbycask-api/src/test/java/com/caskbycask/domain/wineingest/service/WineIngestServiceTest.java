package com.caskbycask.domain.wineingest.service;

import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.SpiritStatus;
import com.caskbycask.domain.spirit.repository.SpiritRepository;
import com.caskbycask.domain.spirit.service.SpiritDetailService;
import com.caskbycask.domain.spirit.service.WineRegionService;
import com.caskbycask.domain.producer.repository.ProducerRepository;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.domain.wineingest.entity.WineIngestItem;
import com.caskbycask.domain.wineingest.entity.WineIngestRun;
import com.caskbycask.domain.wineingest.entity.WineIngestSettings;
import com.caskbycask.domain.wineingest.entity.enums.*;
import com.caskbycask.domain.wineingest.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
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
    void 허가가_닫힌_LIVE작업은_취소하고_다음_fixture를_claim한다() {
        WineIngestRun manual = queuedRun("manual", WineIngestRunType.MANUAL);
        WineIngestRun fixture = queuedRun("fixture", WineIngestRunType.FIXTURE);
        when(settingsRepository.findById(WineIngestSettings.SINGLETON_ID))
                .thenReturn(Optional.of(fixtureSettings()));
        when(runRepository.findByStatusAndLastHeartbeatAtBefore(any(), any())).thenReturn(List.of());
        when(runRepository.findNextForUpdate(eq(WineIngestRunStatus.QUEUED), any(Pageable.class)))
                .thenReturn(List.of(manual, fixture));

        var claimed = service.claimNextRun();

        assertThat(manual.getStatus()).isEqualTo(WineIngestRunStatus.CANCELLED);
        assertThat(manual.getErrorMessage()).contains("LIVE 이용 허가");
        assertThat(claimed.runKey()).isEqualTo("fixture");
        assertThat(fixture.getStatus()).isEqualTo(WineIngestRunStatus.RUNNING);
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

    private static WineIngestRun queuedRun(String key, WineIngestRunType type) {
        return WineIngestRun.builder()
                .runKey(key).runType(type).status(WineIngestRunStatus.QUEUED).requestedLimit(3).build();
    }

    private static WineIngestSettings fixtureSettings() {
        return WineIngestSettings.builder()
                .id(WineIngestSettings.SINGLETON_ID)
                .automationEnabled(false)
                .providerMode(WineIngestProviderMode.FIXTURE)
                .licenseApproved(false)
                .hourlyLimit(10)
                .maxRunItems(3)
                .slackAlertEnabled(true)
                .build();
    }
}
