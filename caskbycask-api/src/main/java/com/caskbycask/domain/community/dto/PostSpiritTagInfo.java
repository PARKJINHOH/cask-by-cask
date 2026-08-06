package com.caskbycask.domain.community.dto;

import com.caskbycask.domain.community.entity.PostSpiritTag;
import com.caskbycask.domain.spirit.entity.Spirit;

/**
 * 게시글에 붙은 주류 태그 표시용.
 * <p>
 * 이름·이미지는 스냅샷이 아니라 조회 시점에 주류 테이블에서 다시 읽는다
 * (주류명이 바뀌면 예전 게시글의 태그도 함께 바뀌어야 한다).
 */
public record PostSpiritTagInfo(
        Long spiritId,
        String nameKo,
        String nameEn,
        String category,
        String imageUrl
) {
    public static PostSpiritTagInfo of(PostSpiritTag tag, String imageUrl) {
        Spirit spirit = tag.getSpirit();
        return new PostSpiritTagInfo(
                spirit.getId(),
                spirit.getNameKo(),
                spirit.getNameEn(),
                spirit.getCategory() != null ? spirit.getCategory().name() : null,
                imageUrl
        );
    }
}
