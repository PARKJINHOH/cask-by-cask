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

    private static final Set<String> HANGUL_LEFT_BOUNDARY_REQUIRED_WORDS = Set.of("보지", "자지");

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
                .filter(word -> containsBadWord(compacted, normalize(word)))
                .collect(Collectors.toList());
    }

    private boolean containsBadWord(String text, String word) {
        if (word.isBlank()) {
            return false;
        }

        int fromIndex = 0;
        while (fromIndex <= text.length() - word.length()) {
            int index = text.indexOf(word, fromIndex);
            if (index < 0) {
                return false;
            }

            if (isValidMatch(text, word, index)) {
                return true;
            }
            fromIndex = index + 1;
        }

        return false;
    }

    private boolean isValidMatch(String text, String word, int start) {
        int end = start + word.length();

        if (isLatinWord(word)) {
            return !hasLatinWordCharBefore(text, start) && !hasLatinWordCharAfter(text, end);
        }

        if (HANGUL_LEFT_BOUNDARY_REQUIRED_WORDS.contains(word)) {
            return !hasHangulCharBefore(text, start);
        }

        return true;
    }

    private String normalize(String text) {
        return text.replaceAll("\\s", "").toLowerCase(Locale.ROOT);
    }

    private boolean isLatinWord(String word) {
        return word.chars().allMatch(ch -> Character.isLetterOrDigit(ch) && !isHangul((char) ch));
    }

    private boolean hasLatinWordCharBefore(String text, int start) {
        return start > 0 && isLatinWordChar(text.charAt(start - 1));
    }

    private boolean hasLatinWordCharAfter(String text, int end) {
        return end < text.length() && isLatinWordChar(text.charAt(end));
    }

    private boolean isLatinWordChar(char ch) {
        return Character.isLetterOrDigit(ch) && !isHangul(ch);
    }

    private boolean hasHangulCharBefore(String text, int start) {
        return start > 0 && isHangul(text.charAt(start - 1));
    }

    private boolean isHangul(char ch) {
        return (ch >= '가' && ch <= '힣') || (ch >= 'ㄱ' && ch <= 'ㅎ') || (ch >= 'ㅏ' && ch <= 'ㅣ');
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
