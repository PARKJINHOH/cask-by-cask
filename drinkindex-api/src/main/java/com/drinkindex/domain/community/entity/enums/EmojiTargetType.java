package com.drinkindex.domain.community.entity.enums;

/**
 * [패치 13] 이모지 반응 대상 유형 (다형성).
 * 게시판 댓글(post_comments)과 술 상세 커뮤니티 댓글(community_comments)을
 * 하나의 comment_emoji_reactions 테이블로 통합 관리한다.
 */
public enum EmojiTargetType {
    POST_COMMENT,    // 게시판 댓글 (PostComment)
    SPIRIT_COMMENT   // 술 상세 커뮤니티 댓글 (CommunityComment)
}
