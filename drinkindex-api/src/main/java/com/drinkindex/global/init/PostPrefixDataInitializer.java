package com.drinkindex.global.init;

import com.drinkindex.domain.community.entity.PostPrefix;
import com.drinkindex.domain.community.entity.enums.BoardType;
import com.drinkindex.domain.community.repository.PostPrefixRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Order(2)
@Component
@RequiredArgsConstructor
public class PostPrefixDataInitializer implements ApplicationRunner {

    private final PostPrefixRepository postPrefixRepository;

    @Override
    public void run(ApplicationArguments args) {
        seedIfEmpty(BoardType.NOTICE, List.of(
                new PrefixSeed("일반",   null,      0),
                new PrefixSeed("이벤트", "#f59e0b", 1)
        ));
        seedIfEmpty(BoardType.FREE, List.of(
                new PrefixSeed("일반", null,      0),
                new PrefixSeed("나눔", "#10b981", 1),
                new PrefixSeed("질문", "#3b82f6", 2),
                new PrefixSeed("비욥", "#f97316", 3)
        ));
        seedPrefixIfMissing(BoardType.FREE, new PrefixSeed("비욥", "#f97316", 3));
    }

    private void seedIfEmpty(BoardType boardType, List<PrefixSeed> seeds) {
        if (!postPrefixRepository.findByBoardTypeOrderBySortOrderAsc(boardType).isEmpty()) {
            return;
        }
        seeds.forEach(s -> postPrefixRepository.save(
                PostPrefix.builder()
                        .boardType(boardType)
                        .name(s.name())
                        .colorHex(s.colorHex())
                        .isActive(true)
                        .sortOrder(s.sortOrder())
                        .build()
        ));
        log.info("[PostPrefixDataInitializer] {} 말머리 {}개 초기화 완료", boardType, seeds.size());
    }

    private void seedPrefixIfMissing(BoardType boardType, PrefixSeed seed) {
        if (postPrefixRepository.findByBoardTypeAndName(boardType, seed.name()).isPresent()) {
            return;
        }
        postPrefixRepository.save(
                PostPrefix.builder()
                        .boardType(boardType)
                        .name(seed.name())
                        .colorHex(seed.colorHex())
                        .isActive(true)
                        .sortOrder(seed.sortOrder())
                        .build()
        );
        log.info("[PostPrefixDataInitializer] {} '{}' 말머리 추가 완료", boardType, seed.name());
    }

    private record PrefixSeed(String name, String colorHex, int sortOrder) {}
}
