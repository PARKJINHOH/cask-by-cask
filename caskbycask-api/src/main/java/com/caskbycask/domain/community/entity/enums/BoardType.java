package com.caskbycask.domain.community.entity.enums;

public enum BoardType {
    NOTICE,
    FREE,
    /** 이미지 갤러리 — 포토카드로 만든 사진을 올리는 게시판. 목록이 이미지형 그리드다. */
    PHOTO;

    /**
     * 프론트 라우트 세그먼트(`/community/{path}/{id}`).
     * <p>
     * 이 문자열이 여러 곳(점수 이력 링크·알림·사이트맵)에 흩어져 있던 탓에
     * 게시판을 추가할 때마다 링크가 어긋났다. enum 이 단일 소스로 소유한다.
     */
    public String path() {
        return name().toLowerCase();
    }
}
