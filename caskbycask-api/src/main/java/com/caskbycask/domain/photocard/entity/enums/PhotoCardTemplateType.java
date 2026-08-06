package com.caskbycask.domain.photocard.entity.enums;

public enum PhotoCardTemplateType {
    /** 관리자가 등록한 공식 템플릿. 소유자가 없고 모두에게 보인다. */
    OFFICIAL,
    /** 사용자가 만든 템플릿. 기본 비공개이며 공개 전환 시 다른 사용자도 쓸 수 있다. */
    USER
}
