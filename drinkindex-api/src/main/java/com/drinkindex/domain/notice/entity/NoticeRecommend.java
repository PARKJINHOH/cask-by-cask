package com.drinkindex.domain.notice.entity;

import com.drinkindex.domain.user.entity.User;
import com.drinkindex.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

// 공지사항 추천 (사용자별 1회). 추천 취소 시 row 삭제 + Notice.recommendCount 감소.
@Entity
@Table(
        name = "notice_recommend",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_notice_recommend_notice_user", columnNames = {"notice_id", "user_id"})
        },
        indexes = {
                @Index(name = "idx_notice_recommend_notice_id", columnList = "notice_id")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class NoticeRecommend extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "notice_id", nullable = false)
    private Notice notice;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
}
