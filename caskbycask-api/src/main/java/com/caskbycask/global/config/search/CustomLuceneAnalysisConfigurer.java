package com.caskbycask.global.config.search;

import org.hibernate.search.backend.lucene.analysis.LuceneAnalysisConfigurationContext;
import org.hibernate.search.backend.lucene.analysis.LuceneAnalysisConfigurer;

public class CustomLuceneAnalysisConfigurer implements LuceneAnalysisConfigurer {
    @Override
    public void configure(LuceneAnalysisConfigurationContext context) {
        // 1. 한국어 형태소 및 단어 분해/결합 분석기 (Nori + 동의어 + 1글자 필터 + WordDelimiter)
        context.analyzer("korean_search").custom()
                .tokenizer("korean")
                    .param("userDictionary", "userdict.txt")
                .tokenFilter("lowercase")
                .tokenFilter("koreanPartOfSpeechStop")
                .tokenFilter("koreanReadingForm")
                .tokenFilter("length")
                    .param("min", "2")
                    .param("max", "100")
                .tokenFilter("synonymGraph")
                    .param("synonyms", "synonyms.txt")
                .tokenFilter("wordDelimiterGraph")
                    .param("generateWordParts", "1")
                    .param("generateNumberParts", "1")
                    .param("catenateWords", "1")
                    .param("catenateNumbers", "1")
                    .param("catenateAll", "1")
                    .param("preserveOriginal", "1");

        // 2. 영어 전용 형태소 분석기 (Standard + 영어 불용어 + 어간 추출 + 1글자 필터 + WordDelimiter)
        context.analyzer("english_search").custom()
                .tokenizer("standard")
                .tokenFilter("lowercase")
                .tokenFilter("stop")
                .tokenFilter("porterStem")
                .tokenFilter("length")
                    .param("min", "2")
                    .param("max", "100")
                .tokenFilter("wordDelimiterGraph")
                    .param("generateWordParts", "1")
                    .param("generateNumberParts", "1")
                    .param("catenateAll", "1");

        // 3. 부분 일치 검색용 NGram 분석기
        context.analyzer("ngram_search").custom()
                .tokenizer("standard")
                .tokenFilter("lowercase")
                .tokenFilter("ngram")
                    .param("minGramSize", "2")
                    .param("maxGramSize", "10");
    }
}
