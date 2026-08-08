package com.caskbycask.domain.wineingest.entity;

import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "spirit_external_references")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class SpiritExternalReference extends BaseTimeEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "spirit_id", nullable = false)
    private Spirit spirit;

    @Column(nullable = false, length = 30) private String provider;
    @Column(nullable = false, length = 100) private String externalWineId;
    @Column(nullable = false, length = 100) private String externalVintageId;
    @Column(nullable = false, unique = true, length = 64) private String identityKey;
    @Column(nullable = false, length = 1000) private String sourceUrl;
}
