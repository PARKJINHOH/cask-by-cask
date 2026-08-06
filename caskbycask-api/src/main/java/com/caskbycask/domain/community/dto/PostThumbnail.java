package com.caskbycask.domain.community.dto;

/**
 * 게시글 목록의 대표 이미지 한 건.
 * <p>
 * 예전에는 {@code List<Object[]>} 로 받아 {@code row[0]}, {@code row[1]} 로 꺼냈는데,
 * select 절에 컬럼을 하나 추가하면 인덱스가 조용히 밀려 엉뚱한 값이 들어갔다.
 * JPQL 생성자 표현식으로 받아 그 취약점을 없앤다.
 * <p>
 * width/height 는 기존 이미지를 백필하지 않아 null 일 수 있다.
 */
public record PostThumbnail(Long postId, String imageUrl, Integer width, Integer height) {}
