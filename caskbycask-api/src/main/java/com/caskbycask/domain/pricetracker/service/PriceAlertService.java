package com.caskbycask.domain.pricetracker.service;

import com.caskbycask.domain.community.entity.enums.NotificationType;
import com.caskbycask.domain.community.service.NotificationService;
import com.caskbycask.domain.pricetracker.dto.request.UpsertPriceAlertRequest;
import com.caskbycask.domain.pricetracker.dto.response.PriceAlertResponse;
import com.caskbycask.domain.pricetracker.entity.PriceAlert;
import com.caskbycask.domain.pricetracker.entity.enums.StoreType;
import com.caskbycask.domain.pricetracker.repository.PriceAlertRepository;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.repository.SpiritRepository;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class PriceAlertService {

    private final PriceAlertRepository priceAlertRepository;
    private final SpiritRepository spiritRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    /** 알림함에서 클릭하면 해당 주류의 가격 화면으로 이동한다(targetId = spiritId). */
    private static final String PRICE_ALERT_TARGET_TYPE = "SPIRIT_PRICE";
    private static final Map<StoreType, String> STORE_TYPE_LABEL = Map.of(
            StoreType.DOMESTIC, "국내",
            StoreType.OVERSEAS, "해외",
            StoreType.DUTYFREE, "면세");
    private static final NumberFormat KRW_FORMAT = NumberFormat.getIntegerInstance(Locale.KOREA);

    @Transactional
    public PriceAlertResponse upsertPriceAlert(Long userId, UpsertPriceAlertRequest request) {
        Spirit spirit = spiritRepository.findById(request.spiritId())
                .orElseThrow(() -> new CustomException(ErrorCode.SPIRIT_NOT_FOUND));
        User user = userRepository.getByIdOrThrow(userId);

        // 알림은 차트 탭과 같은 구간 단위다 — 같은 술·용량이라도 국내/해외/면세 목표가를 따로 둘 수 있다.
        StoreType storeType = request.storeType() != null ? request.storeType() : StoreType.DOMESTIC;

        // 같은 술·용량·구간당 1개. 기존 volume=null 알림은 사용자가 다시 저장할 때 현재 용량으로 전환한다.
        PriceAlert alert = priceAlertRepository
                .findByUserIdAndSpiritIdAndVolumeMlAndStoreType(
                        userId, request.spiritId(), request.volumeMl(), storeType)
                .or(() -> priceAlertRepository
                        .findByUserIdAndSpiritIdAndVolumeMlIsNullAndStoreType(
                                userId, request.spiritId(), storeType))
                .map(existing -> {
                    existing.updateTarget(request.targetPrice());
                    existing.updateVolume(request.volumeMl());
                    existing.updateStoreType(storeType);
                    existing.reactivate();
                    return existing;
                })
                .orElseGet(() -> PriceAlert.builder()
                        .user(user)
                        .spirit(spirit)
                        .volumeMl(request.volumeMl())
                        .storeType(storeType)
                        .targetPriceKrw(request.targetPrice())
                        .build());

        return PriceAlertResponse.from(priceAlertRepository.save(alert));
    }

    @Transactional(readOnly = true)
    public List<PriceAlertResponse> getMyAlerts(Long userId) {
        return priceAlertRepository.findByUserId(userId)
                .stream().map(PriceAlertResponse::from).toList();
    }

    @Transactional
    public void deletePriceAlert(Long alertId, Long userId) {
        PriceAlert alert = getAlertAndValidateOwner(alertId, userId);
        priceAlertRepository.delete(alert);
    }

    @Transactional
    public PriceAlertResponse togglePriceAlert(Long alertId, Long userId) {
        PriceAlert alert = getAlertAndValidateOwner(alertId, userId);
        alert.toggleActive();
        return PriceAlertResponse.from(priceAlertRepository.save(alert));
    }

    /**
     * 가격 승인 시 호출 — 승인된 가격이 목표가 이하면 알림을 보낸다.
     *
     * <p>{@code finalPriceKrw} 는 반드시 <b>원화로 환산된</b> 금액이어야 한다. 예전에는 호출 측이
     * 원 통화 금액({@code getActualPrice()})을 넘기고 국내 KRW 제보만 통과시키는 게이트로 이를
     * 가렸는데, 지금은 해외·면세까지 대상이라 환산값({@code resolveActualPriceKrw()})이 전제다.
     *
     * <p>발동 조건은 세 가지다 — 목표가 이하, 24시간 쿨다운 경과, 직전 알림가보다 저렴.
     */
    @Transactional
    public void checkAndNotifyAlerts(Long spiritId, Integer volumeMl, StoreType storeType,
                                     BigDecimal finalPriceKrw, Long priceReportId) {
        if (finalPriceKrw == null || storeType == null) return;

        List<PriceAlert> alerts = new ArrayList<>();
        if (volumeMl != null) {
            alerts.addAll(priceAlertRepository
                    .findBySpiritIdAndVolumeMlAndStoreTypeAndIsActiveTrue(spiritId, volumeMl, storeType));
        }
        // 마이그레이션 전 생성된 알림은 기존 의미(해당 주류 전체 용량)를 유지한다.
        alerts.addAll(priceAlertRepository
                .findBySpiritIdAndVolumeMlIsNullAndStoreTypeAndIsActiveTrue(spiritId, storeType));

        for (PriceAlert alert : alerts) {
            if (alert.getTargetPriceKrw() == null) continue;
            if (alert.isTriggeredRecently()) continue;                              // 24시간 내 중복 방지
            if (alert.getTargetPriceKrw().compareTo(finalPriceKrw) < 0) continue;   // 목표가 미달
            if (!alert.isCheaperThanLastNotified(finalPriceKrw)) continue;          // 같은 가격 재알림 억제

            // 저장에 성공했을 때만 발동 시각을 남긴다. 실패한 채로 쿨다운을 걸면 알림이 조용히 사라진다.
            try {
                notificationService.sendNow(
                        alert.getUser(),
                        NotificationType.PRICE_ALERT,
                        buildMessage(alert, volumeMl, storeType, finalPriceKrw),
                        PRICE_ALERT_TARGET_TYPE,
                        spiritId);
            } catch (RuntimeException e) {
                log.warn("Price alert notification failed; will retry on the next approval: alertId={}",
                        alert.getId(), e);
                continue;
            }

            alert.markNotified(finalPriceKrw);
            priceAlertRepository.save(alert);

            log.info("Price alert notified: userId={}, spiritId={}, volumeMl={}, storeType={}, target={}, actual={}, reportId={}",
                    alert.getUser().getId(), spiritId, volumeMl, storeType,
                    alert.getTargetPriceKrw(), finalPriceKrw, priceReportId);
        }
    }

    private String buildMessage(PriceAlert alert, Integer volumeMl, StoreType storeType,
                                BigDecimal finalPriceKrw) {
        String volumeLabel = volumeMl != null ? " " + volumeMl + "ml" : "";
        return String.format("[%s%s] %s 목표가 %s원 도달! 현재 최저가 %s원",
                alert.getSpirit().getNameKo(),
                volumeLabel,
                STORE_TYPE_LABEL.getOrDefault(storeType, ""),
                KRW_FORMAT.format(alert.getTargetPriceKrw()),
                KRW_FORMAT.format(finalPriceKrw));
    }

    // ═══════════════════════════════════════════
    // Private
    // ═══════════════════════════════════════════

    private PriceAlert getAlertAndValidateOwner(Long alertId, Long userId) {
        PriceAlert alert = priceAlertRepository.findById(alertId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND));
        if (!alert.getUser().getId().equals(userId)) {
            throw new CustomException(ErrorCode.FORBIDDEN);
        }
        return alert;
    }
}
