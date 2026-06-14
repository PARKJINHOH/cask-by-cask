package com.caskbycask.domain.community.entity;

import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

@Entity
@Table(name = "poll_options")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class PollOption extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "poll_id", nullable = false)
    @Comment("투표(polls.id)")
    private Poll poll;

    @Column(nullable = false, length = 200)
    @Comment("선택지 내용")
    private String optionText;

    @Builder.Default
    @Column(nullable = false)
    @Comment("득표 수")
    private Integer voteCount = 0;

    @Builder.Default
    @Column(name = "sort_order", nullable = false)
    @Comment("정렬 순서")
    private Integer sortOrder = 0;

    public void incrementVoteCount() { this.voteCount++; }
    public void decrementVoteCount() { if (this.voteCount > 0) this.voteCount--; }
}
