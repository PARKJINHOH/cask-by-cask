package com.caskbycask.global.util;

import com.caskbycask.domain.community.entity.BadWord;
import com.caskbycask.domain.community.repository.BadWordRepository;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

class BadWordFilterTest {

    @Test
    void detect_doesNotFlagBenignInitialSequenceFromHangulSyllables() {
        BadWordFilter filter = filterWithWords("ㅅㅂ", "시발");

        List<String> detected = filter.detect("시트러스 보다 적절하게 밸런스 잘 맞춘 달달한 느낌");

        assertThat(detected).isEmpty();
    }

    @Test
    void detect_flagsExplicitInitialBadWordEvenWithSpaces() {
        BadWordFilter filter = filterWithWords("ㅅㅂ");

        List<String> detected = filter.detect("ㅅ ㅂ");

        assertThat(detected).containsExactly("ㅅㅂ");
    }

    @Test
    void detect_flagsFullBadWordEvenWithSpaces() {
        BadWordFilter filter = filterWithWords("시발");

        List<String> detected = filter.detect("시 발");

        assertThat(detected).containsExactly("시발");
    }

    private BadWordFilter filterWithWords(String... words) {
        BadWordRepository repository = mock(BadWordRepository.class);
        given(repository.findAllByIsActiveTrue()).willReturn(
                List.of(words).stream()
                        .map(word -> BadWord.builder().word(word).build())
                        .toList()
        );

        BadWordFilter filter = new BadWordFilter(repository);
        filter.refreshCache();
        return filter;
    }
}
