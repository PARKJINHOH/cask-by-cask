package com.drinkindex.domain.user.dto;

import com.drinkindex.domain.user.entity.enums.Role;

/**
 * 인증 필터 전용 경량 사용자 뷰.
 *
 * JwtAuthenticationFilter 는 인증된 모든 요청마다 사용자 정보를 조회한다.
 * User 엔티티 전체를 findById 로 가져오면 roleType(EAGER ManyToOne)·boardPermissions(EAGER ElementCollection)
 * 까지 매 요청 함께 로딩되지만, 인증 컨텍스트 구성에는 id·email·password·role·active 만 필요하다.
 * 이 프로젝션으로 단일 경량 SELECT 만 수행해 요청당 DB 부하를 줄인다.
 */
public record AuthUserView(
        Long id,
        String email,
        String password,
        Role role,
        boolean active
) {
}
