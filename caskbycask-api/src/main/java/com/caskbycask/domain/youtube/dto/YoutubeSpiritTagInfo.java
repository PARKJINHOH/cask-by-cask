package com.caskbycask.domain.youtube.dto;

import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.youtube.entity.YoutubeVideoSpiritTag;

/**
 * 영상에 붙은 주류 태그 표시용.
 * <p>
 * 이름은 스냅샷이 아니라 조회 시점에 주류 테이블에서 다시 읽는다 — 주류명이 바뀌면
 * 예전 영상의 태그도 함께 바뀌어야 한다({@code PostSpiritTagInfo} 와 같은 규칙).
 */
public record YoutubeSpiritTagInfo(
        Long spiritId,
        String nameKo,
        String nameEn,
        String category
) {
    public static YoutubeSpiritTagInfo from(YoutubeVideoSpiritTag tag) {
        Spirit spirit = tag.getSpirit();
        return new YoutubeSpiritTagInfo(
                spirit.getId(),
                spirit.getNameKo(),
                spirit.getNameEn(),
                spirit.getCategory() != null ? spirit.getCategory().name() : null
        );
    }
}
