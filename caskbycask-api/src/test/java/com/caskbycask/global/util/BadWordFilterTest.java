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

    @Test
    void detect_doesNotFlagBojiInsideNormalKoreanVerbPhrase() {
        BadWordFilter filter = filterWithWords("보지");

        List<String> detected = filter.detect(
                "다른 배치는 마셔보지는 못했지만 최소한 Spring 2025버전은 맛있는 위스키라고 생각됩니다."
        );

        assertThat(detected).isEmpty();
    }

    @Test
    void detect_flagsStandaloneBojiEvenWithParticle() {
        BadWordFilter filter = filterWithWords("보지");

        List<String> detected = filter.detect("보지가 포함된 노골적인 표현");

        assertThat(detected).containsExactly("보지");
    }

    @Test
    void detect_doesNotFlagJajiInsideNormalKoreanVerbPhrase() {
        BadWordFilter filter = filterWithWords("자지");

        List<String> detected = filter.detect("밤에 잠을 자지 못해서 피곤했다.");

        assertThat(detected).isEmpty();
    }

    @Test
    void detect_doesNotFlagLatinBadWordInsideNormalWord() {
        BadWordFilter filter = filterWithWords("cunt", "shit");

        List<String> detected = filter.detect("Scunthorpe tasting note with shitake mushroom nuance");

        assertThat(detected).isEmpty();
    }

    @Test
    void detect_flagsLatinBadWordEvenWithSpaces() {
        BadWordFilter filter = filterWithWords("fuck");

        List<String> detected = filter.detect("f u c k");

        assertThat(detected).containsExactly("fuck");
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
