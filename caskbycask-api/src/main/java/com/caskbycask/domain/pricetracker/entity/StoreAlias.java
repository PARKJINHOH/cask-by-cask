package com.caskbycask.domain.pricetracker.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

@Entity
@Table(name = "store_aliases", indexes = {
        @Index(name = "idx_store_alias_alias", columnList = "alias")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("판매처 별칭")
public class StoreAlias {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false)
    @Comment("판매처(stores.id)")
    private Store store;

    @Column(nullable = false, length = 200)
    @Comment("판매처 별칭")
    private String alias;
}
