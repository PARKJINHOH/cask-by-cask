package com.caskbycask.domain.spirit.entity.enums;

/** 와인 빈티지 표기 상태. 연도 값 자체는 Spirit.vintageYear가 단일 소스로 관리한다. */
public enum WineVintageStatus {
    VINTAGE,
    NON_VINTAGE,
    UNKNOWN
}
