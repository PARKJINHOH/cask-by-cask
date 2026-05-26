package com.drinkindex.domain.nicknamebadword.entity;

import com.drinkindex.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "nickname_bad_words")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class NicknameBadWord extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String word;

    @Builder.Default
    @Column(nullable = false)
    private Boolean isActive = true;

    public void setIsActive(Boolean isActive) { this.isActive = isActive; }
}
