package com.caskbycask.global.config.search;

import org.hibernate.search.backend.lucene.analysis.LuceneAnalysisConfigurationContext;
import org.hibernate.search.backend.lucene.analysis.LuceneAnalysisConfigurer;

public class CustomLuceneAnalysisConfigurer implements LuceneAnalysisConfigurer {
    @Override
    public void configure(LuceneAnalysisConfigurationContext context) {
        // 1. 한국어 형태소 및 단어 분해/결합 분석기 (Nori + WordDelimiter)
        // 컴파일 타임 의존성 충돌을 피하기 위해 토크나이저와 필터를 문자열 이름으로 매핑합니다.
        context.analyzer("korean_search").custom()
                .tokenizer("korean")
                .tokenFilter("lowercase")
                .tokenFilter("koreanPartOfSpeechStop")
                .tokenFilter("koreanReadingForm")
                .tokenFilter("wordDelimiterGraph")
                    .param("generateWordParts", "1")
                    .param("generateNumberParts", "1")
                    .param("catenateWords", "1")
                    .param("catenateNumbers", "1")
                    .param("catenateAll", "1")
                    .param("preserveOriginal", "1");

        // 2. 부분 일치 검색용 NGram 분석기
        // (단어가 잘렸거나, 띄어쓰기가 완전히 없는 '글렌알라키12', '알라키12' 등의 검색에 매칭되게 지원)
        context.analyzer("ngram_search").custom()
                .tokenizer("standard")
                .tokenFilter("lowercase")
                .tokenFilter("ngram")
                    .param("minGramSize", "2")
                    .param("maxGramSize", "10");
    }
}
