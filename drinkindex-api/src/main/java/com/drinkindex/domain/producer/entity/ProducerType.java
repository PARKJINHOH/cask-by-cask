package com.drinkindex.domain.producer.entity;

/**
 * 생산자 종류. 위스키→증류소, 와인→와이너리, 꼬냑→꼬냑하우스, 기타→기타.
 * (winery / cognac_house 테이블을 producer 테이블로 통합하면서 도입)
 */
public enum ProducerType {
    DISTILLERY,
    WINERY,
    COGNAC_HOUSE,
    OTHER
}
