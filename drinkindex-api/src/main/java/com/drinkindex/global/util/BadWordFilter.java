package com.drinkindex.global.util;

import com.drinkindex.domain.community.entity.BadWord;
import com.drinkindex.domain.community.repository.BadWordRepository;
import com.drinkindex.global.exception.BadWordDetectedException;
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

    // 초성 19개 (유니코드 가(0xAC00) 기준 초성 인덱스 순서)
    private static final char[] CHOSUNG = {
        'ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'
    };

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
     *   3) 한글 초성 변환 후 비교 ("ㅅㅂ" 패턴 방어)
     */
    public List<String> detect(String text) {
        if (text == null || text.isBlank() || badWordSet.isEmpty()) {
            return Collections.emptyList();
        }

        String plain = Jsoup.parse(text).text();
        String compacted = plain.replaceAll("\\s", "").toLowerCase();
        String initials  = extractInitials(compacted);

        return badWordSet.stream()
                .filter(word -> {
                    String w = word.toLowerCase();
                    return compacted.contains(w) || initials.contains(w);
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

    // 한글 완성자를 초성 문자로 변환, 그 외 문자는 그대로 유지
    private String extractInitials(String text) {
        StringBuilder sb = new StringBuilder(text.length());
        for (char c : text.toCharArray()) {
            if (c >= 0xAC00 && c <= 0xD7A3) {
                int choIndex = (c - 0xAC00) / (21 * 28);
                sb.append(CHOSUNG[choIndex]);
            } else {
                sb.append(c);
            }
        }
        return sb.toString();
    }
}
