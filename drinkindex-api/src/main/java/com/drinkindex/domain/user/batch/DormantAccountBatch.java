package com.drinkindex.domain.user.batch;

import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.policy.AccountPolicy;
import com.drinkindex.domain.user.repository.UserRepository;
import com.drinkindex.domain.user.service.AccountHardDeleteService;
import com.drinkindex.global.auth.jwt.RefreshTokenRepository;
import com.drinkindex.global.email.EmailSender;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 휴면 계정 라이프사이클 배치.
 * 1) 휴면 전환 사전 통지(D-7)  2) 휴면 전환(365일)  3) 휴면 후 365일 경과 시 자동 탈퇴.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DormantAccountBatch {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final EmailSender emailSender;
    private final AccountHardDeleteService accountHardDeleteService;

    /** 매일 새벽 3시 30분 — 휴면 전환 7일 전 사전 통지 메일 발송 */
    @Scheduled(cron = "0 30 3 * * *")
    @Transactional(readOnly = true)
    public void sendDormantPreNotices() {
        List<User> targets = userRepository.findDormantNoticeTargets(
                AccountPolicy.dormantNoticeWindowStart(),
                AccountPolicy.dormantNoticeWindowEnd());

        for (User user : targets) {
            try {
                emailSender.send(
                        user.getEmail(),
                        "[DrinkIndex] 휴면 계정 전환 예정 안내",
                        buildPreNoticeBody(user.getNickname()));
            } catch (Exception e) {
                log.warn("휴면 사전 통지 메일 발송 실패 — userId: {}, error: {}", user.getId(), e.getMessage());
            }
        }
        log.info("휴면 사전 통지 발송 완료 — 대상: {}건", targets.size());
    }

    /** 매일 새벽 4시 — 365일 미접속 계정 휴면 전환 + Refresh Token 폐기 */
    @Scheduled(cron = "0 0 4 * * *")
    @Transactional
    public void convertDormantAccounts() {
        LocalDateTime cutoff = AccountPolicy.dormantCutoff();
        List<User> candidates = userRepository.findDormantCandidates(cutoff);

        for (User user : candidates) {
            user.markDormant();
            refreshTokenRepository.deleteByUserId(user.getId());
        }

        log.info("휴면 계정 전환 완료 — 기준 시각: {}, 전환 건수: {}", cutoff, candidates.size());
    }

    /**
     * 매일 새벽 4시 10분 — 휴면 후 365일 경과 계정 영구 삭제(개인정보 파기).
     * 게시글·리뷰·댓글은 센티넬로 재귀속 보존, 그 외 개인 데이터와 users 행은 물리 삭제.
     * 계정별 독립 트랜잭션으로 처리하여 일부 실패가 전체를 중단시키지 않도록 한다.
     */
    @Scheduled(cron = "0 10 4 * * *")
    public void deleteLongDormantAccounts() {
        LocalDateTime cutoff = AccountPolicy.dormantDeleteCutoff();
        List<Long> targetIds = userRepository.findByDormantTrueAndDormantAtBefore(cutoff)
                .stream().map(User::getId).toList();

        int deleted = 0;
        for (Long userId : targetIds) {
            try {
                accountHardDeleteService.hardDelete(userId);
                deleted++;
            } catch (Exception e) {
                log.error("장기 휴면 계정 영구삭제 실패 — userId: {}, error: {}", userId, e.getMessage(), e);
            }
        }

        log.info("장기 휴면 계정 영구삭제 완료 — 기준 시각: {}, 대상: {}건, 처리: {}건", cutoff, targetIds.size(), deleted);
    }

    private String buildPreNoticeBody(String nickname) {
        return """
                안녕하세요, %s님.

                회원님의 DrinkIndex 계정이 장기간 미접속으로 %d일 후 휴면 상태로 전환될 예정입니다.
                휴면 전환을 원치 않으시면 전환 예정일 전에 로그인해 주세요.

                ※ 안내
                - 휴면 전환 후 %d일(약 1년)이 더 경과하면 계정은 자동으로 탈퇴 처리됩니다.
                - 다만 회원님이 작성하신 리뷰, 게시글 등 커뮤니티 데이터는 탈퇴 후에도 보존됩니다.
                - 휴면 계정은 로그인 시 이메일 인증을 통해 즉시 해제할 수 있습니다.

                감사합니다.
                DrinkIndex 드림
                """.formatted(nickname, AccountPolicy.DORMANT_NOTICE_LEAD_DAYS, AccountPolicy.DORMANT_DELETE_DAYS);
    }
}
