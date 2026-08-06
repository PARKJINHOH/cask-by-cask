package com.caskbycask.domain.wineingest.service;

import com.caskbycask.domain.producer.entity.*;
import com.caskbycask.domain.producer.repository.ProducerRepository;
import com.caskbycask.domain.spirit.dto.WineDetailRequest;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.enums.*;
import com.caskbycask.domain.spirit.repository.SpiritRepository;
import com.caskbycask.domain.spirit.service.*;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.domain.wineingest.dto.WineIngestDtos;
import com.caskbycask.domain.wineingest.entity.*;
import com.caskbycask.domain.wineingest.entity.enums.*;
import com.caskbycask.domain.wineingest.repository.*;
import com.caskbycask.global.exception.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class WineIngestService {
    private static final Set<String> KOREAN_NAME_EVIDENCE_DOMAINS = Set.of(
            "dailyshot.co", "winenara.com", "wine21.com", "wine12.com", "wine12.co.kr",
            "xwine.club", "xwine.co.kr");

    private final WineIngestSettingsRepository settingsRepository;
    private final WineIngestRunRepository runRepository;
    private final WineIngestItemRepository itemRepository;
    private final SpiritExternalReferenceRepository externalReferenceRepository;
    private final SpiritRepository spiritRepository;
    private final ProducerRepository producerRepository;
    private final UserRepository userRepository;
    private final SpiritDetailService spiritDetailService;
    private final WineRegionService wineRegionService;

    @Transactional(readOnly = true)
    public WineIngestDtos.SettingsResponse settings() {
        return WineIngestDtos.SettingsResponse.from(requireSettings());
    }

    @Transactional
    public WineIngestDtos.SettingsResponse updateSettings(WineIngestDtos.SettingsUpdateRequest request) {
        if (request.providerMode() == WineIngestProviderMode.LIVE
                && (!request.licenseApproved() || !hasText(request.usageGrantRef()))) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        if (request.automationEnabled() && request.providerMode() != WineIngestProviderMode.LIVE) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        WineIngestSettings settings = requireSettings();
        settings.update(request.automationEnabled(), request.providerMode(), request.licenseApproved(),
                trimToNull(request.usageGrantRef()), request.hourlyLimit(), request.maxRunItems(),
                request.slackAlertEnabled());
        return WineIngestDtos.SettingsResponse.from(settings);
    }

    @Transactional(readOnly = true)
    public WineIngestDtos.DashboardResponse dashboard() {
        Page<WineIngestRun> latest = runRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, 1));
        return new WineIngestDtos.DashboardResponse(settings(),
                runRepository.countByStatus(WineIngestRunStatus.QUEUED),
                runRepository.countByStatus(WineIngestRunStatus.RUNNING),
                latest.hasContent() ? WineIngestDtos.RunResponse.from(latest.getContent().get(0)) : null);
    }

    @Transactional(readOnly = true)
    public Page<WineIngestDtos.RunResponse> runs(int page, int size) {
        return runRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, Math.min(size, 100)))
                .map(WineIngestDtos.RunResponse::from);
    }

    @Transactional(readOnly = true)
    public Page<WineIngestDtos.ItemResponse> items(Long runId, int page, int size) {
        return itemRepository.findByRunIdOrderByIdAsc(runId, PageRequest.of(page, Math.min(size, 100)))
                .map(WineIngestDtos.ItemResponse::from);
    }

    @Transactional
    public WineIngestDtos.RunResponse createManualRun(WineIngestDtos.ManualRunRequest request, Long userId) {
        WineIngestSettings settings = requireSettings();
        if (request.runType() == WineIngestRunType.SCHEDULED) throw new CustomException(ErrorCode.INVALID_INPUT);
        if (request.runType() == WineIngestRunType.FIXTURE && request.limit() > 3) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        if (request.runType() == WineIngestRunType.MANUAL && !isLiveAuthorized(settings)) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        int limit = Math.min(request.limit(), settings.getMaxRunItems());
        if (request.runType() == WineIngestRunType.MANUAL) {
            limit = remainingHourlyCapacity(settings, limit);
        }
        return WineIngestDtos.RunResponse.from(saveQueuedRun(request.runType(), limit, userId));
    }

    @Transactional
    public WineIngestDtos.RunResponse createScheduledRun() {
        WineIngestSettings settings = requireSettings();
        if (!settings.isAutomationEnabled() || !isLiveAuthorized(settings)) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        int limit = remainingHourlyCapacity(settings, settings.getMaxRunItems());
        return WineIngestDtos.RunResponse.from(saveQueuedRun(WineIngestRunType.SCHEDULED, limit, null));
    }

    private int remainingHourlyCapacity(WineIngestSettings settings, int requestedLimit) {
        long alreadyRequested = runRepository.sumRequestedLimitSince(LocalDateTime.now().minusHours(1));
        int remaining = (int) Math.max(0, settings.getHourlyLimit() - alreadyRequested);
        if (remaining == 0) throw new CustomException(ErrorCode.INVALID_INPUT);
        return Math.min(requestedLimit, remaining);
    }

    private WineIngestRun saveQueuedRun(WineIngestRunType type, int limit, Long userId) {
        return runRepository.save(WineIngestRun.builder()
                .runKey(UUID.randomUUID().toString())
                .runType(type)
                .status(WineIngestRunStatus.QUEUED)
                .requestedLimit(limit)
                .requestedBy(userId != null ? userRepository.getByIdOrThrow(userId) : null)
                .build());
    }

    @Transactional
    public WineIngestDtos.RunResponse cancelRun(Long id) {
        WineIngestRun run = requireRun(id);
        run.cancel();
        return WineIngestDtos.RunResponse.from(run);
    }

    @Transactional(readOnly = true)
    public WineIngestDtos.InternalConfigResponse internalConfig() {
        WineIngestSettings s = requireSettings();
        return new WineIngestDtos.InternalConfigResponse(s.getProviderMode(), isLiveAuthorized(s),
                s.getHourlyLimit(), s.getMaxRunItems(), s.isSlackAlertEnabled(), s.getUsageGrantRef());
    }

    @Transactional
    public WineIngestDtos.RunResponse claimNextRun() {
        runRepository.findByStatusAndLastHeartbeatAtBefore(
                        WineIngestRunStatus.RUNNING, LocalDateTime.now().minusMinutes(30))
                .forEach(run -> run.finish("30분 동안 heartbeat가 없어 실패 처리했습니다."));
        List<WineIngestRun> queued = runRepository.findNextForUpdate(
                WineIngestRunStatus.QUEUED, PageRequest.of(0, 1));
        if (queued.isEmpty()) return null;
        WineIngestRun run = queued.get(0);
        WineIngestSettings settings = requireSettings();
        if (run.getRunType() == WineIngestRunType.MANUAL && !isLiveAuthorized(settings)) return null;
        if (run.getRunType() == WineIngestRunType.SCHEDULED
                && (!settings.isAutomationEnabled() || !isLiveAuthorized(settings))) return null;
        run.start();
        return WineIngestDtos.RunResponse.from(run);
    }

    @Transactional
    public WineIngestDtos.RunResponse heartbeat(String runKey) {
        WineIngestRun run = requireRun(runKey);
        run.heartbeat();
        return WineIngestDtos.RunResponse.from(run);
    }

    @Transactional
    public WineIngestDtos.ItemResponse importWine(String runKey, WineIngestDtos.WineImportRequest request) {
        WineIngestRun run = requireRunningRun(runKey);
        WineIngestSettings settings = requireSettings();
        validateImportAuthorization(run, settings, request);

        String vintageLabel = request.vintageStatus() == WineVintageStatus.NON_VINTAGE
                ? "NV" : String.valueOf(request.vintageYear());
        if (externalReferenceRepository.existsByProviderAndExternalWineIdAndExternalVintageId(
                request.provider(), request.externalWineId(), request.externalVintageId())) {
            return recordItem(run, request, WineIngestItemStatus.DUPLICATE_SKIPPED,
                    "EXTERNAL_ID_DUPLICATE", "동일한 제공자 와인/빈티지 ID가 이미 등록되어 PASS 처리했습니다.", null, vintageLabel);
        }

        Optional<Producer> producer = producerRepository.findFirstByTypeAndNameEnIgnoreCase(
                ProducerType.WINERY, request.producerNameEn().trim());
        if (producer.isEmpty()) {
            return recordItem(run, request, WineIngestItemStatus.FAILED,
                    "PRODUCER_NOT_FOUND", "등록된 와이너리를 찾지 못했습니다: " + request.producerNameEn(), null, vintageLabel);
        }

        String identityKey = sha256(producer.get().getId() + "|" + normalize(request.nameEn()) + "|" + vintageLabel);
        if (externalReferenceRepository.existsByIdentityKey(identityKey)) {
            return recordItem(run, request, WineIngestItemStatus.DUPLICATE_SKIPPED,
                    "IDENTITY_DUPLICATE", "생산자/영문명/빈티지가 같은 와인이 이미 등록되어 PASS 처리했습니다.", null, vintageLabel);
        }

        WineRegion regionCode = wineRegionService.resolve(request.regionCode(), SpiritCategory.WINE);
        String regionText = regionCode != null ? regionCode.topLevel().getNameKo() : trimToNull(request.region());
        Spirit master = spiritRepository
                .findFirstByCategoryAndProducerIdAndParentIsNullAndNameEnIgnoreCase(
                        SpiritCategory.WINE, producer.get().getId(), request.nameEn().trim())
                .orElseGet(() -> createMaster(request, producer.get(), regionCode, regionText));

        Spirit child = Spirit.builder()
                .nameKo(request.nameKo().trim()).nameEn(request.nameEn().trim())
                .category(SpiritCategory.WINE).producer(producer.get())
                .vintageYear(request.vintageStatus() == WineVintageStatus.VINTAGE ? request.vintageYear() : null)
                .abv(request.abv()).volumeMl(request.volumeMl())
                .country(request.country().trim()).region(regionText).regionCode(regionCode)
                .status(SpiritStatus.HIDDEN).parent(master).variantType(VariantType.VINTAGE)
                .variantValue(vintageLabel).variantValueEn(vintageLabel)
                .seriesIdentifier("빈티지").seriesIdentifierEn("Vintage")
                .displayOrder(spiritRepository.findByParentId(master.getId()).size())
                .build();
        child.assignExternalSource(request.provider(), request.sourceUrl(), request.imageUrl(),
                request.rating(), request.ratingCount());
        child = spiritRepository.save(child);
        spiritDetailService.saveWineDetail(child, request.wineDetail());

        master.assignExternalSource(request.provider(), request.sourceUrl(), request.imageUrl(),
                request.rating(), request.ratingCount());
        externalReferenceRepository.save(SpiritExternalReference.builder()
                .spirit(child).provider(request.provider())
                .externalWineId(request.externalWineId()).externalVintageId(request.externalVintageId())
                .identityKey(identityKey).sourceUrl(request.sourceUrl())
                .usageGrantRef(request.usageGrantRef()).build());

        return recordItem(run, request, WineIngestItemStatus.CREATED,
                null, null, child, vintageLabel);
    }

    private Spirit createMaster(WineIngestDtos.WineImportRequest request, Producer producer,
                                WineRegion regionCode, String regionText) {
        Spirit master = Spirit.builder()
                .nameKo(request.nameKo().trim()).nameEn(request.nameEn().trim())
                .category(SpiritCategory.WINE).producer(producer)
                .country(request.country().trim()).region(regionText).regionCode(regionCode)
                .status(SpiritStatus.HIDDEN).variantType(VariantType.VINTAGE)
                .seriesIdentifier("빈티지").seriesIdentifierEn("Vintage").build();
        master.assignExternalSource(request.provider(), request.sourceUrl(), request.imageUrl(),
                request.rating(), request.ratingCount());
        master = spiritRepository.save(master);
        WineDetailRequest detail = request.wineDetail();
        spiritDetailService.saveWineDetail(master, new WineDetailRequest(
                detail.wineType(), WineVintageStatus.UNKNOWN, detail.isOakAged(), detail.isNaturalWine(),
                detail.certification(), detail.grapeVarieties(), detail.appellationDesignation(),
                detail.soilType(), detail.altitudeM(), detail.harvestMethod(), detail.fermentationVessel(),
                detail.oakType(), detail.oakAgedMonths(), detail.sweetness(), detail.body(),
                detail.acidity(), detail.tannin(), null));
        return master;
    }

    @Transactional
    public WineIngestDtos.ItemResponse recordFailure(String runKey, WineIngestDtos.FailureItemRequest request) {
        WineIngestRun run = requireRunningRun(runKey);
        if (request.status() != WineIngestItemStatus.FAILED
                && request.status() != WineIngestItemStatus.NOT_FOUND_SKIPPED) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        WineIngestItem item = itemRepository.save(WineIngestItem.builder()
                .run(run).status(request.status()).provider(request.provider())
                .externalWineId(request.externalWineId()).externalVintageId(request.externalVintageId())
                .sourceUrl(request.sourceUrl()).wineNameEn(request.wineNameEn()).wineNameKo(request.wineNameKo())
                .vintageLabel(request.vintageLabel()).reasonCode(request.reasonCode())
                .reasonMessage(request.reasonMessage()).build());
        run.record(request.status());
        return WineIngestDtos.ItemResponse.from(item);
    }

    @Transactional
    public WineIngestDtos.RunResponse finishRun(String runKey, WineIngestDtos.FinishRunRequest request) {
        WineIngestRun run = requireRunningRun(runKey);
        run.finish(trimToNull(request.errorMessage()));
        return WineIngestDtos.RunResponse.from(run);
    }

    private WineIngestDtos.ItemResponse recordItem(
            WineIngestRun run, WineIngestDtos.WineImportRequest request,
            WineIngestItemStatus status, String reasonCode, String reasonMessage,
            Spirit spirit, String vintageLabel) {
        WineIngestItem item = itemRepository.save(WineIngestItem.builder()
                .run(run).status(status).provider(request.provider())
                .externalWineId(request.externalWineId()).externalVintageId(request.externalVintageId())
                .sourceUrl(request.sourceUrl()).wineNameEn(request.nameEn()).wineNameKo(request.nameKo())
                .vintageLabel(vintageLabel).reasonCode(reasonCode).reasonMessage(reasonMessage)
                .spirit(spirit).build());
        run.record(status);
        return WineIngestDtos.ItemResponse.from(item);
    }

    private void validateImportAuthorization(WineIngestRun run, WineIngestSettings settings,
                                             WineIngestDtos.WineImportRequest request) {
        if (!"VIVINO".equals(request.provider())) throw new CustomException(ErrorCode.INVALID_INPUT);
        if (!hostMatches(request.sourceUrl(), "vivino.com")) throw new CustomException(ErrorCode.INVALID_INPUT);
        if (run.getRunType() == WineIngestRunType.FIXTURE) {
            if (!request.usageGrantRef().startsWith("fixture:")) throw new CustomException(ErrorCode.INVALID_INPUT);
        } else if (!isLiveAuthorized(settings) || !request.usageGrantRef().equals(settings.getUsageGrantRef())) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        if (request.vintageStatus() == WineVintageStatus.VINTAGE && request.vintageYear() == null) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        if (request.vintageStatus() == WineVintageStatus.NON_VINTAGE && request.vintageYear() != null) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        if (request.vintageStatus() == WineVintageStatus.UNKNOWN
                || request.wineDetail().vintageStatus() != request.vintageStatus()) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        boolean hasDomesticEvidence = run.getRunType() == WineIngestRunType.FIXTURE
                && request.koreanNameEvidenceUrls().stream().anyMatch(url -> url.startsWith("fixture:"));
        hasDomesticEvidence = hasDomesticEvidence || request.koreanNameEvidenceUrls().stream()
                .anyMatch(url -> KOREAN_NAME_EVIDENCE_DOMAINS.stream().anyMatch(domain -> hostMatches(url, domain)));
        if (!hasDomesticEvidence) throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    private WineIngestSettings requireSettings() {
        return settingsRepository.findById(WineIngestSettings.SINGLETON_ID)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_INPUT));
    }

    private WineIngestRun requireRun(Long id) {
        return runRepository.findById(id).orElseThrow(() -> new CustomException(ErrorCode.INVALID_INPUT));
    }

    private WineIngestRun requireRun(String key) {
        return runRepository.findByRunKey(key).orElseThrow(() -> new CustomException(ErrorCode.INVALID_INPUT));
    }

    private WineIngestRun requireRunningRun(String key) {
        WineIngestRun run = requireRun(key);
        if (run.getStatus() != WineIngestRunStatus.RUNNING
                || run.getAttemptedCount() >= run.getRequestedLimit()) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        return run;
    }

    private static boolean isLiveAuthorized(WineIngestSettings s) {
        return s.getProviderMode() == WineIngestProviderMode.LIVE
                && s.isLicenseApproved() && hasText(s.getUsageGrantRef());
    }

    private static boolean hostMatches(String url, String domain) {
        try {
            String host = URI.create(url).getHost();
            return host != null && (host.equalsIgnoreCase(domain)
                    || host.toLowerCase(Locale.ROOT).endsWith("." + domain.toLowerCase(Locale.ROOT)));
        } catch (RuntimeException ignored) {
            return false;
        }
    }

    private static String normalize(String value) {
        return value == null ? "" : value.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
    }

    private static String sha256(String value) {
        try {
            byte[] bytes = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(bytes);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private static boolean hasText(String value) { return value != null && !value.isBlank(); }
    private static String trimToNull(String value) { return hasText(value) ? value.trim() : null; }
}
