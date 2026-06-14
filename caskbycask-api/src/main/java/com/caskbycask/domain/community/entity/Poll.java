package com.caskbycask.domain.community.entity;

import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "polls")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("게시글 투표")
public class Poll extends BaseTimeEntity {

    @Id
    @Comment("PK(posts.id 공유)")
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "id")
    private Post post;

    @Column(nullable = false, length = 300)
    @Comment("투표 질문")
    private String question;

    @Builder.Default
    @Column(nullable = false)
    @Comment("복수 선택 허용 여부")
    private Boolean isMultipleChoice = false;

    @Comment("투표 마감 일시")
    private LocalDateTime endsAt;

    @Builder.Default
    @OneToMany(mappedBy = "poll", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PollOption> options = new ArrayList<>();

    public boolean isExpired() {
        return endsAt != null && LocalDateTime.now().isAfter(endsAt);
    }
}
