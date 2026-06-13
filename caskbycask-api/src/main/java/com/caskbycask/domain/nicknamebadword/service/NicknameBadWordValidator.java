package com.caskbycask.domain.nicknamebadword.service;

import com.caskbycask.domain.nicknamebadword.entity.NicknameBadWord;
import com.caskbycask.domain.nicknamebadword.repository.NicknameBadWordRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class NicknameBadWordValidator {

    private final NicknameBadWordRepository repository;

    private volatile Set<String> wordSet = Collections.emptySet();

    @PostConstruct
    public void init() {
        refreshCache();
    }

    public void refreshCache() {
        Set<String> loaded = repository.findAllByIsActiveTrue()
                .stream()
                .map(NicknameBadWord::getWord)
                .map(String::toLowerCase)
                .collect(Collectors.toUnmodifiableSet());
        wordSet = loaded;
        log.info("NicknameBadWordValidator cache refreshed — {} words loaded", loaded.size());
    }

    public boolean contains(String nickname) {
        if (nickname == null || nickname.isBlank() || wordSet.isEmpty()) {
            return false;
        }
        String normalized = nickname.replaceAll("\\s", "").toLowerCase();
        return wordSet.stream().anyMatch(normalized::contains);
    }

    public void validate(String nickname) {
        if (contains(nickname)) {
            throw new CustomException(ErrorCode.NICKNAME_BAD_WORD_DETECTED);
        }
    }
}
