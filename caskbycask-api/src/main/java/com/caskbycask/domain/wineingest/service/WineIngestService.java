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
        WineIngestSettings settings = requireSettingsForUpdate();
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
        WineIngestSettings settings = requireSettingsForUpdate();
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
        WineIngestSettings settings = requireSettingsForUpdate();
        if (!settings.isAutomationEnabled() || !isLiveAuthorized(settings)) {
            return null;
        }
        int limit = remainingHourlyCapacityOrZero(settings, settings.getMaxRunItems());
        if (limit == 0) return null;
        return WineIngestDtos.RunResponse.from(saveQueuedRun(WineIngestRunType.SCHEDULED, limit, null));
    }

    private int remainingHourlyCapacity(WineIngestSettings settings, int requestedLimit) {
        int remaining = remainingHourlyCapacityOrZero(settings, requestedLimit);
        if (remaining == 0) throw new CustomException(ErrorCode.INVALID_INPUT);
        return remaining;
    }

    private int remainingHourlyCapacityOrZero(WineIngestSettings settings, int requestedLimit) {
        long alreadyRequested = runRepository.sumRequestedLimitSince(LocalDateTime.now().minusHours(1));
        int remaining = (int) Math.max(0, settings.getHourlyLimit() - alreadyRequested);
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
                s.isAutomationEnabled(), s.getHourlyLimit(), s.getMaxRunItems(),
                s.isSlackAlertEnabled(), s.getUsageGrantRef());
    }

    @Transactional
    public WineIngestDtos.RunResponse claimNextRun() {
        runRepository.findByStatusAndLastHeartbeatAtBefore(
                        WineIngestRunStatus.RUNNING, LocalDateTime.now().minusMinutes(30))
                .forEach(run -> run.finish("30분 동안 heartbeat가 없어 실패 처리했습니다."));
        WineIngestSettings settings = requireSettings();
        while (true) {
            List<WineIngestRun> queued = runRepository.findNextForUpdate(
                    WineIngestRunStatus.QUEUED, PageRequest.of(0, 20));
            if (queued.isEmpty()) return null;
            for (WineIngestRun run : queued) {
                String rejection = claimRejectionReason(run, settings);
                if (rejection != null) {
                    run.cancel(rejection);
                    continue;
                }
                run.start();
                return WineIngestDtos.RunResponse.from(run);
            }
            runRepository.flush();
        }
    }

    private String claimRejectionReason(WineIngestRun run, WineIngestSettings settings) {
        if (run.getRunType() == WineIngestRunType.MANUAL && !isLiveAuthorized(settings)) {
            return "LIVE 이용 허가가 비활성화되어 대기 작업을 취소했습니다.";
        }
        if (run.getRunType() == WineIngestRunType.SCHEDULED
                && (!settings.isAutomationEnabled() || !isLiveAuthorized(settings))) {
            return "자동 수집 또는 LIVE 이용 허가가 비활성화되어 예약 작업을 취소했습니다.";
        }
        return null;
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

        // 와이너리는 선택값이다. 원문에 없거나 아직 등록되지 않았으면 생산자 없이 저장하고 검수에서 연결한다.
        Producer producer = hasText(request.producerNameEn())
                ? producerRepository.findFirstByTypeAndNameEnIgnoreCase(
                        ProducerType.WINERY, request.producerNameEn().trim()).orElse(null)
                : null;
        Long producerId = producer != null ? producer.getId() : null;

        // 생산자를 모르면 외부 와인 ID로 동일성 범위를 잡는다. 이름만 같은 다른 와이너리 와인과 섞이지 않는다.
        String identityScope = producerId != null
                ? String.valueOf(producerId)
                : request.provider() + ":" + request.externalWineId();
        String identityKey = sha256(identityScope + "|" + normalize(request.nameEn()) + "|" + vintageLabel);
        if (externalReferenceRepository.existsByIdentityKey(identityKey)) {
            return recordItem(run, request, WineIngestItemStatus.DUPLICATE_SKIPPED,
                    "IDENTITY_DUPLICATE", "생산자/영문명/빈티지가 같은 와인이 이미 등록되어 PASS 처리했습니다.", null, vintageLabel);
        }

        List<Spirit> existingWines = spiritRepository.findExistingWineVintage(
                producerId, request.nameEn().trim(),
                request.vintageStatus() == WineVintageStatus.VINTAGE ? request.vintageYear() : null,
                request.vintageStatus() == WineVintageStatus.NON_VINTAGE);
        if (!existingWines.isEmpty()) {
            Spirit existing = existingWines.get(0);
            saveExternalReference(existing, request, identityKey);
            return recordItem(run, request, WineIngestItemStatus.DUPLICATE_SKIPPED,
                    "CATALOG_DUPLICATE",
                    "기존 주류 DB에 생산자·영문명·빈티지가 같은 와인이 있어 PASS 처리했습니다.",
                    existing, vintageLabel);
        }

        WineRegion regionCode = wineRegionService.resolve(request.regionCode(), SpiritCategory.WINE);
        String regionText = regionCode != null ? regionCode.topLevel().getNameKo() : trimToNull(request.region());
        Spirit master = resolveMaster(request, producer, regionCode, regionText);

        List<Spirit> sameVintage = spiritRepository.findByParentIdAndVariantValueIgnoreCaseAndStatusIn(
                master.getId(), vintageLabel, Arrays.asList(SpiritStatus.values()));
        if (!sameVintage.isEmpty()) {
            Spirit existing = sameVintage.get(0);
            saveExternalReference(existing, request, identityKey);
            return recordItem(run, request, WineIngestItemStatus.DUPLICATE_SKIPPED,
                    "MASTER_VINTAGE_DUPLICATE", "같은 마스터에 동일 빈티지가 이미 있어 PASS 처리했습니다.",
                    existing, vintageLabel);
        }

        Spirit child = Spirit.builder()
                .nameKo(request.nameEn().trim()).nameEn(request.nameEn().trim())
                .category(SpiritCategory.WINE).producer(producer)
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

        // 이미 출처 스냅샷이 있는 마스터(관리자 검수본 포함)는 덮어쓰지 않는다.
        if (master.getSourceProvider() == null) {
            master.assignExternalSource(request.provider(), request.sourceUrl(), request.imageUrl(),
                    request.rating(), request.ratingCount());
        }
        saveExternalReference(child, request, identityKey);

        String notice = producerNotice(request, producer);
        return recordItem(run, request, WineIngestItemStatus.CREATED,
                notice != null ? "PRODUCER_UNRESOLVED" : null, notice, child, vintageLabel);
    }

    /**
     * 생산자를 아는 와인은 생산자+영문명으로 마스터를 찾는다. 생산자를 모를 때 영문명만으로 묶으면
     * 다른 와이너리의 동명 와인이 한 마스터에 섞이므로, 같은 외부 와인 ID로 먼저 등록된 빈티지가
     * 있을 때만 그 마스터를 재사용한다.
     */
    private Spirit resolveMaster(WineIngestDtos.WineImportRequest request, Producer producer,
                                 WineRegion regionCode, String regionText) {
        Optional<Spirit> existing = producer != null
                ? spiritRepository.findFirstByCategoryAndProducerIdAndParentIsNullAndNameEnIgnoreCase(
                        SpiritCategory.WINE, producer.getId(), request.nameEn().trim())
                : externalReferenceRepository
                        .findFirstByProviderAndExternalWineIdOrderByIdAsc(
                                request.provider(), request.externalWineId())
                        .map(SpiritExternalReference::getSpirit)
                        .map(spirit -> spirit.getParent() != null ? spirit.getParent() : spirit);
        return existing.orElseGet(() -> createMaster(request, producer, regionCode, regionText));
    }

    private static String producerNotice(WineIngestDtos.WineImportRequest request, Producer producer) {
        if (producer != null) return null;
        return hasText(request.producerNameEn())
                ? "등록된 와이너리를 찾지 못해 생산자 없이 저장했습니다. 검수에서 연결하세요: "
                        + request.producerNameEn().trim()
                : "수집 원문에 와이너리가 없어 생산자 없이 저장했습니다. 검수에서 연결하세요.";
    }

    private Spirit createMaster(WineIngestDtos.WineImportRequest request, Producer producer,
                                WineRegion regionCode, String regionText) {
        Spirit master = Spirit.builder()
                .nameKo(request.nameEn().trim()).nameEn(request.nameEn().trim())
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

    private void saveExternalReference(Spirit spirit, WineIngestDtos.WineImportRequest request,
                                       String identityKey) {
        externalReferenceRepository.save(SpiritExternalReference.builder()
                .spirit(spirit).provider(request.provider())
                .externalWineId(request.externalWineId()).externalVintageId(request.externalVintageId())
                .identityKey(identityKey).sourceUrl(request.sourceUrl())
                .usageGrantRef(request.usageGrantRef()).build());
    }

    @Transactional
    public WineIngestDtos.ItemResponse publishItem(Long itemId) {
        WineIngestItem item = itemRepository.findWithSpiritById(itemId)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_INPUT));
        if (item.getStatus() != WineIngestItemStatus.CREATED || item.getSpirit() == null) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        Spirit child = item.getSpirit();
        Spirit master = child.getParent() != null ? child.getParent() : child;
        if (!hasText(master.getNameKo()) || !hasText(master.getNameEn())
                || master.getNameKo().trim().equalsIgnoreCase(master.getNameEn().trim())) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        master.rename(master.getNameKo().trim(), master.getNameEn().trim());
        child.rename(master.getNameKo(), master.getNameEn());
        master.activate();
        child.activate();
        return WineIngestDtos.ItemResponse.from(item);
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
                .sourceUrl(request.sourceUrl()).wineNameEn(request.nameEn()).wineNameKo(null)
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
    }

    private WineIngestSettings requireSettings() {
        return settingsRepository.findById(WineIngestSettings.SINGLETON_ID)
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_INPUT));
    }

    private WineIngestSettings requireSettingsForUpdate() {
        return settingsRepository.findByIdForUpdate(WineIngestSettings.SINGLETON_ID)
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
