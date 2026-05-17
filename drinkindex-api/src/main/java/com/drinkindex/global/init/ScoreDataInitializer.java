package com.drinkindex.global.init;

import com.drinkindex.domain.score.entity.MemberLevelConfig;
import com.drinkindex.domain.score.entity.ScoreConfig;
import com.drinkindex.domain.score.entity.enums.ScoreActionType;
import com.drinkindex.domain.score.repository.MemberLevelConfigRepository;
import com.drinkindex.domain.score.repository.ScoreConfigRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Order(3)
@Component
@RequiredArgsConstructor
public class ScoreDataInitializer implements ApplicationRunner {

    private final ScoreConfigRepository scoreConfigRepository;
    private final MemberLevelConfigRepository memberLevelConfigRepository;

    @Override
    public void run(ApplicationArguments args) {
        seedScoreConfig();
        seedLevelConfig();
    }

    // ── ScoreConfig 초기값 ────────────────────────────────────

    private record ScoreSeed(ScoreActionType action, int score, Integer dailyLimit, String desc) {}

    private void seedScoreConfig() {
        if (scoreConfigRepository.count() > 0) return;

        List<ScoreSeed> seeds = List.of(
            new ScoreSeed(ScoreActionType.POST_WRITE_GENERAL,         5,  null, "자유게시판 일반 글쓰기"),
            new ScoreSeed(ScoreActionType.POST_WRITE_QUESTION,        5,  null, "자유게시판 질문 글쓰기"),
            new ScoreSeed(ScoreActionType.POST_WRITE_REVIEW,          8,  null, "자유게시판 리뷰 글쓰기"),
            new ScoreSeed(ScoreActionType.POST_WRITE_SHARING,         5,  null, "자유게시판 나눔 글쓰기"),
            new ScoreSeed(ScoreActionType.POST_WRITE_DISTILLERY_TOUR, 8,  null, "자유게시판 증류소투어 글쓰기"),
            new ScoreSeed(ScoreActionType.POST_WRITE_NOTICE,          10, null, "소식 게시판 글쓰기"),
            new ScoreSeed(ScoreActionType.POST_DELETE,                -5, null, "게시글 삭제 차감"),
            new ScoreSeed(ScoreActionType.POST_LOCKED,                -10,null, "신고 잠금 차감"),
            new ScoreSeed(ScoreActionType.POST_LIKED,                 2,  null, "추천 받음"),
            new ScoreSeed(ScoreActionType.COMMENT_WRITE,              1,  20,   "댓글 작성 (일일 최대 20점)"),
            new ScoreSeed(ScoreActionType.SPIRIT_REVIEW_WRITE,        20, null, "술 상세 리뷰 작성"),
            new ScoreSeed(ScoreActionType.SPIRIT_REQUEST,             10, null, "술 등록 요청"),
            new ScoreSeed(ScoreActionType.SPIRIT_REQUEST_APPROVED,    30, null, "술 등록 요청 승인"),
            new ScoreSeed(ScoreActionType.WISHLIST_ADD,               1,  null, "위시리스트 추가"),
            new ScoreSeed(ScoreActionType.ATTENDANCE,                 3,  null, "출석 체크"),
            new ScoreSeed(ScoreActionType.ATTENDANCE_STREAK_7,        10, null, "7일 연속 출석 보너스"),
            new ScoreSeed(ScoreActionType.ATTENDANCE_STREAK_30,       30, null, "30일 연속 출석 보너스"),
            new ScoreSeed(ScoreActionType.ADMIN_ADJUST,               0,  null, "관리자 수동 조정 (실제값은 amount 파라미터 사용)")
        );

        seeds.forEach(s -> scoreConfigRepository.save(
            ScoreConfig.builder()
                .actionType(s.action())
                .score(s.score())
                .dailyLimit(s.dailyLimit())
                .description(s.desc())
                .build()
        ));
        log.info("[ScoreDataInitializer] ScoreConfig {}개 초기화 완료", seeds.size());
    }

    // ── MemberLevelConfig 초기값 ──────────────────────────────

    private record LevelSeed(int level, String name, int minScore) {}

    private void seedLevelConfig() {
        if (memberLevelConfigRepository.count() > 0) return;

        List<LevelSeed> seeds = List.of(
            new LevelSeed(1,  "몰트",   0),
            new LevelSeed(2,  "스피릿", 50),
            new LevelSeed(3,  "스카치", 150),
            new LevelSeed(4,  "12yo",  350),
            new LevelSeed(5,  "15yo",  700),
            new LevelSeed(6,  "18yo",  1200),
            new LevelSeed(7,  "CS",    2000),
            new LevelSeed(8,  "21yo",  3500),
            new LevelSeed(9,  "30yo",  6000),
            new LevelSeed(10, "40yo",  10000),
            new LevelSeed(11, "50yo",  20000)
        );

        seeds.forEach(s -> memberLevelConfigRepository.save(
            MemberLevelConfig.builder()
                .level(s.level())
                .name(s.name())
                .minScore(s.minScore())
                .build()
        ));
        log.info("[ScoreDataInitializer] MemberLevelConfig {}개 초기화 완료", seeds.size());
    }
}
