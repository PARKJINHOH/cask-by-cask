package com.drinkindex.domain.pricetracker.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "store_aliases", indexes = {
        @Index(name = "idx_store_alias_alias", columnList = "alias")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class StoreAlias {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    @Column(nullable = false, length = 200)
    private String alias;
}
