package com.drinkindex.domain.pricetracker.service;

import com.drinkindex.domain.community.entity.enums.NotificationType;
import com.drinkindex.domain.community.service.NotificationService;
import com.drinkindex.domain.pricetracker.dto.request.UpsertPriceAlertRequest;
import com.drinkindex.domain.pricetracker.dto.response.PriceAlertResponse;
import com.drinkindex.domain.pricetracker.entity.PriceAlert;
import com.drinkindex.domain.pricetracker.repository.PriceAlertRepository;
import com.drinkindex.domain.spirit.entity.Spirit;
import com.drinkindex.domain.spirit.repository.SpiritRepository;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.repository.UserRepository;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class PriceAlertService {

    private final PriceAlertRepository priceAlertRepository;
    private final SpiritRepository spiritRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Transactional
    public PriceAlertResponse upsertPriceAlert(Long userId, UpsertPriceAlertRequest request) {
        Spirit spirit = spiritRepository.findById(request.spiritId())
                .orElseThrow(() -> new CustomException(ErrorCode.SPIRIT_NOT_FOUND));
        User user = userRepository.getByIdOrThrow(userId);

        // 술 1개당 1개 — 있으면 목표가 갱신 + 활성화
        PriceAlert alert = priceAlertRepository
                .findByUserIdAndSpiritId(userId, request.spiritId())
                .map(existing -> {
                    existing.updateTarget(request.targetPrice());
                    existing.reactivate();
                    return existing;
                })
                .orElseGet(() -> PriceAlert.builder()
                        .user(user)
                        .spirit(spirit)
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
     * 가격 승인 시 호출 — 면세 가격 제외, 24시간 내 중복 발동 방지
     */
    @Transactional
    public void checkAndNotifyAlerts(Long spiritId, BigDecimal finalPriceKrw, Long priceReportId) {
        if (finalPriceKrw == null) return;

        List<PriceAlert> alerts = priceAlertRepository.findBySpiritIdAndIsActiveTrue(spiritId);

        for (PriceAlert alert : alerts) {
            if (alert.getTargetPriceKrw() == null) continue;
            if (alert.isTriggeredRecently()) continue;  // 24시간 내 중복 방지
            if (alert.getTargetPriceKrw().compareTo(finalPriceKrw) < 0) continue; // 목표가 미달

            String spiritName = alert.getSpirit().getNameKo();
            String message = String.format("[%s] 목표 가격(%s원)에 도달했습니다! 현재 최저가: %s원",
                    spiritName,
                    alert.getTargetPriceKrw().toPlainString(),
                    finalPriceKrw.toPlainString());

            // 비동기 별도 트랜잭션으로 알림 저장 — 실패해도 승인 롤백 없음
            notificationService.send(
                    alert.getUser(),
                    NotificationType.PRICE_ALERT,
                    message,
                    "PRICE_REPORT",
                    priceReportId);

            alert.markNotified();
            priceAlertRepository.save(alert);

            log.info("Price alert notified: userId={}, spiritId={}, target={}, actual={}",
                    alert.getUser().getId(), spiritId,
                    alert.getTargetPriceKrw(), finalPriceKrw);
        }
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
