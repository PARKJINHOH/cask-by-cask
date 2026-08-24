package com.caskbycask.domain.deal.service;

import com.caskbycask.domain.deal.entity.DealPost;
import com.caskbycask.domain.deal.repository.DealPostRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * V96 이전에 적재된 외화 딜의 원화 환산값을 수집일 환율로 채운다.
 *
 * <p>과거 환율은 SQL 로 구할 수 없어 마이그레이션에서 처리하지 못한다. 운영 반영 직후 한 번
 * {@code POST /api/admin/deals/backfill-krw} 를 호출해 정리하고, 이후로는 저장 시점에
 * {@link DealExchangeRateApplier} 가 채우므로 다시 쓸 일이 없다(재실행해도 안전하다).
 *
 * <p>같은 날짜는 환율을 한 번만 조회한다. 실패한 날짜는 재시도하지 않고 건너뛰어
 * 제공자에 불필요한 부하를 주지 않는다 — 남은 행은 환산값이 없어 차트에서 제외된 상태로 유지된다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DealKrwBackfillService {

    private final DealPostRepository dealPostRepository;
    private final DealExchangeRateApplier exchangeRateApplier;

    @Transactional
    public BackfillResult backfill() {
        List<DealPost> targets = dealPostRepository.findForeignDealsMissingKrw();
        Set<LocalDate> failedDates = new HashSet<>();
        int converted = 0;
        int skipped = 0;

        for (DealPost deal : targets) {
            LocalDate rateDate = deal.getCrawledAt() != null
                    ? deal.getCrawledAt().toLocalDate()
                    : deal.getCreatedAt().toLocalDate();

            if (failedDates.contains(rateDate)) {
                skipped++;
                continue;
            }
            if (exchangeRateApplier.applyForDate(deal, rateDate)) {
                converted++;
            } else {
                failedDates.add(rateDate);
                skipped++;
            }
        }

        log.info("Deal KRW backfill finished: total={}, converted={}, skipped={}, failedDates={}",
                targets.size(), converted, skipped, failedDates);
        return new BackfillResult(targets.size(), converted, skipped);
    }

    public record BackfillResult(int total, int converted, int skipped) {}
}
