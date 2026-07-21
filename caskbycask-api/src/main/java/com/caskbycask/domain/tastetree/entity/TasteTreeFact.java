package com.caskbycask.domain.tastetree.entity;

import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "taste_tree_facts", indexes = {
        @Index(name = "idx_taste_tree_facts_order", columnList = "display_order,id")
}, uniqueConstraints = {
        @UniqueConstraint(name = "ux_taste_tree_facts_content_ko", columnNames = "content_ko")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class TasteTreeFact extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "content_ko", nullable = false, length = 160)
    private String contentKo;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder;
}
