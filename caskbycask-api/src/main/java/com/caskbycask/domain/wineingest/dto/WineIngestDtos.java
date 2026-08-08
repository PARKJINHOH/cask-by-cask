package com.caskbycask.domain.wineingest.dto;

import com.caskbycask.domain.spirit.dto.WineDetailRequest;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.enums.WineVintageStatus;
import com.caskbycask.domain.wineingest.entity.*;
import com.caskbycask.domain.wineingest.entity.enums.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public final class WineIngestDtos {
    private WineIngestDtos() {}

    public record SettingsResponse(
            boolean automationEnabled,
            int hourlyLimit,
            int maxRunItems,
            boolean slackAlertEnabled,
            LocalDateTime updatedAt
    ) {
        public static SettingsResponse from(WineIngestSettings s) {
            return new SettingsResponse(s.isAutomationEnabled(), s.getHourlyLimit(),
                    s.getMaxRunItems(), s.isSlackAlertEnabled(), s.getUpdatedAt());
        }
    }

    public record SettingsUpdateRequest(
            boolean automationEnabled,
            @Min(1) @Max(10) int hourlyLimit,
            @Min(1) @Max(10) int maxRunItems,
            boolean slackAlertEnabled
    ) {}

    public record ManualRunRequest(
            @NotNull WineIngestRunType runType,
            @Min(1) @Max(10) int limit
    ) {}

    public record RunResponse(
            Long id, String runKey, WineIngestRunType runType, WineIngestRunStatus status,
            int requestedLimit, int attemptedCount, int createdCount, int duplicateCount,
            int skippedCount, int failedCount, String errorMessage,
            LocalDateTime startedAt, LocalDateTime lastHeartbeatAt, LocalDateTime finishedAt,
            LocalDateTime createdAt
    ) {
        public static RunResponse from(WineIngestRun r) {
            if (r == null) return null;
            return new RunResponse(r.getId(), r.getRunKey(), r.getRunType(), r.getStatus(),
                    r.getRequestedLimit(), r.getAttemptedCount(), r.getCreatedCount(),
                    r.getDuplicateCount(), r.getSkippedCount(), r.getFailedCount(), r.getErrorMessage(),
                    r.getStartedAt(), r.getLastHeartbeatAt(), r.getFinishedAt(), r.getCreatedAt());
        }
    }

    public record ItemResponse(
            Long id, Long runId, WineIngestItemStatus status, String provider,
            String externalWineId, String externalVintageId, String sourceUrl,
            String wineNameEn, String wineNameKo, String vintageLabel,
            String reasonCode, String reasonMessage, Long spiritId, Long masterSpiritId,
            boolean koreanNameReady, boolean published, LocalDateTime createdAt
    ) {
        public static ItemResponse from(WineIngestItem i) {
            Spirit spirit = i.getSpirit();
            Spirit master = spirit != null && spirit.getParent() != null ? spirit.getParent() : spirit;
            boolean koreanNameReady = master != null
                    && hasText(master.getNameKo())
                    && !master.getNameKo().trim().equalsIgnoreCase(master.getNameEn().trim());
            return new ItemResponse(i.getId(), i.getRun().getId(), i.getStatus(), i.getProvider(),
                    i.getExternalWineId(), i.getExternalVintageId(), i.getSourceUrl(),
                    i.getWineNameEn(), i.getWineNameKo(), i.getVintageLabel(),
                    i.getReasonCode(), i.getReasonMessage(),
                    spirit != null ? spirit.getId() : null,
                    master != null ? master.getId() : null,
                    koreanNameReady,
                    spirit != null && master != null
                            && spirit.getStatus() == com.caskbycask.domain.spirit.entity.enums.SpiritStatus.ACTIVE
                            && master.getStatus() == com.caskbycask.domain.spirit.entity.enums.SpiritStatus.ACTIVE,
                    i.getCreatedAt());
        }
    }

    public record DashboardResponse(
            SettingsResponse settings,
            long queuedCount,
            long runningCount,
            RunResponse latestRun
    ) {}

    public record InternalConfigResponse(
            boolean automationEnabled,
            int hourlyLimit,
            int maxRunItems,
            boolean slackAlertEnabled
    ) {}

    public record WineImportRequest(
            @NotBlank @Size(max = 30) String provider,
            @NotBlank @Size(max = 100) String externalWineId,
            @NotBlank @Size(max = 100) String externalVintageId,
            @NotBlank @Size(max = 1000) String sourceUrl,
            @Size(max = 1000) String imageUrl,
            @NotBlank @Size(max = 200) String nameEn,
            /** 와이너리는 선택값이다. 미확인이면 생산자 없이 저장하고 관리자 검수에서 연결한다. */
            @Size(max = 200) String producerNameEn,
            @NotBlank @Size(max = 100) String country,
            @Size(max = 100) String region,
            @Size(max = 40) String regionCode,
            @NotNull WineVintageStatus vintageStatus,
            @Min(1800) @Max(2100) Integer vintageYear,
            @NotNull @DecimalMin("0.0") @DecimalMax("100.0") BigDecimal abv,
            @NotNull @Min(1) @Max(30000) Integer volumeMl,
            @Valid @NotNull WineDetailRequest wineDetail,
            @DecimalMin("0.0") @DecimalMax("5.0") BigDecimal rating,
            @Min(0) Integer ratingCount
    ) {}

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    public record FailureItemRequest(
            @NotBlank @Size(max = 30) String provider,
            @Size(max = 100) String externalWineId,
            @Size(max = 100) String externalVintageId,
            @Size(max = 1000) String sourceUrl,
            @Size(max = 200) String wineNameEn,
            @Size(max = 200) String wineNameKo,
            @Size(max = 20) String vintageLabel,
            @NotNull WineIngestItemStatus status,
            @NotBlank @Size(max = 60) String reasonCode,
            @NotBlank @Size(max = 2000) String reasonMessage
    ) {}

    public record FinishRunRequest(@Size(max = 2000) String errorMessage) {}
}
