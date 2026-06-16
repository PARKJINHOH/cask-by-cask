package com.caskbycask.global.util;

import com.caskbycask.domain.community.entity.BadWord;
import com.caskbycask.domain.community.repository.BadWordRepository;
import com.caskbycask.global.exception.BadWordDetectedException;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class BadWordFilter {

    private final BadWordRepository badWordRepository;

    // volatile: refreshCache()가 새 Set 참조를 원자적으로 교체 → 읽기 스레드가 항상 최신 Set을 봄
    private volatile Set<String> badWordSet = Collections.emptySet();

    @PostConstruct
    public void init() {
        refreshCache();
    }

    public void refreshCache() {
        Set<String> loaded = badWordRepository.findAllByIsActiveTrue()
                .stream()
                .map(BadWord::getWord)
                .collect(Collectors.toUnmodifiableSet());
        badWordSet = loaded;
        log.info("BadWordFilter cache refreshed — {} words loaded", loaded.size());
    }

    /**
     * 텍스트에서 금지어를 탐지하여 감지된 단어 목록을 반환.
     * 탐지 전략:
     *   1) HTML 태그 제거
     *   2) 공백 제거 후 비교 (스페이스 삽입 우회 방어)
     *
     * 초성 금칙어(예: "ㅅㅂ")는 사용자가 실제 초성 문자를 입력한 경우만 잡는다.
     * 일반 한글 문장을 초성으로 변환해 비교하면 "시트러스 보다" 같은 정상 문구도 오탐된다.
     */
    public List<String> detect(String text) {
        if (text == null || text.isBlank() || badWordSet.isEmpty()) {
            return Collections.emptyList();
        }

        String plain = Jsoup.parse(text).text();
        String compacted = plain.replaceAll("\\s", "").toLowerCase();

        return badWordSet.stream()
                .filter(word -> {
                    String w = word.replaceAll("\\s", "").toLowerCase();
                    return !w.isBlank() && compacted.contains(w);
                })
                .collect(Collectors.toList());
    }

    /**
     * 여러 필드를 동시에 검사하고 감지 시 {@link BadWordDetectedException} 발생.
     * 게시글·댓글·쪽지 저장 전 호출.
     */
    public void validate(String... texts) {
        List<String> detected = Arrays.stream(texts)
                .filter(Objects::nonNull)
                .flatMap(t -> detect(t).stream())
                .distinct()
                .collect(Collectors.toList());

        if (!detected.isEmpty()) {
            throw new BadWordDetectedException(detected);
        }
    }
}
