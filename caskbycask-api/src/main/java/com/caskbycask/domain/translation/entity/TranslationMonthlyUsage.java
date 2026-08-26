package com.caskbycask.domain.translation.entity;

import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Entity
@Table(name = "translation_monthly_usage",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_translation_usage_provider_month",
                columnNames = {"provider", "usage_month"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class TranslationMonthlyUsage extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 30, nullable = false)
    private String provider;

    @Column(name = "usage_month", nullable = false)
    private LocalDate usageMonth;

    @Builder.Default
    @Column(name = "allocated_characters", nullable = false)
    private long allocatedCharacters = 0;

    public void allocate(long characters) {
        this.allocatedCharacters += characters;
    }
}
