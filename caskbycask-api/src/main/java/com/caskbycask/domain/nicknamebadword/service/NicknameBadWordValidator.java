package com.caskbycask.domain.nicknamebadword.service;

import com.caskbycask.domain.nicknamebadword.entity.NicknameBadWord;
import com.caskbycask.domain.nicknamebadword.repository.NicknameBadWordRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.util.Collections;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class NicknameBadWordValidator {

    private final NicknameBadWordRepository repository;

    // [보안] 비속어 우회 방어용 정규화 — 문자/숫자 이외(공백·.·-·zero-width 등)를 모두 제거.
    //   "시.발", "시-발", "ㅂㅏ보" 류의 구분자 삽입 우회를 차단한다.
    private static final Pattern NON_ALPHANUMERIC = Pattern.compile("[^\\p{L}\\p{N}]");

    private volatile Set<String> wordSet = Collections.emptySet();

    @PostConstruct
    public void init() {
        refreshCache();
    }

    public void refreshCache() {
        // 저장된 금지어도 동일 규칙으로 정규화해 비교 기준을 일치시킨다.
        Set<String> loaded = repository.findAllByIsActiveTrue()
                .stream()
                .map(NicknameBadWord::getWord)
                .map(this::normalize)
                .filter(w -> !w.isEmpty())
                .collect(Collectors.toUnmodifiableSet());
        wordSet = loaded;
        log.info("NicknameBadWordValidator cache refreshed — {} words loaded", loaded.size());
    }

    public boolean contains(String nickname) {
        if (nickname == null || nickname.isBlank() || wordSet.isEmpty()) {
            return false;
        }
        String normalized = normalize(nickname);
        if (normalized.isEmpty()) {
            return false;
        }
        return wordSet.stream().anyMatch(normalized::contains);
    }

    /** 유니코드 NFKC 정규화 + 문자/숫자 외 제거 + 소문자화. */
    private String normalize(String input) {
        String nfkc = Normalizer.normalize(input, Normalizer.Form.NFKC);
        return NON_ALPHANUMERIC.matcher(nfkc).replaceAll("").toLowerCase();
    }

    public void validate(String nickname) {
        if (contains(nickname)) {
            throw new CustomException(ErrorCode.NICKNAME_BAD_WORD_DETECTED);
        }
    }
}
