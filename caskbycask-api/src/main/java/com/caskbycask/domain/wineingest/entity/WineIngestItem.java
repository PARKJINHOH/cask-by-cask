package com.caskbycask.domain.wineingest.entity;

import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.wineingest.entity.enums.WineIngestItemStatus;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "wine_ingest_items")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class WineIngestItem extends BaseTimeEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "run_id", nullable = false)
    private WineIngestRun run;

    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 40)
    private WineIngestItemStatus status;

    @Column(nullable = false, length = 30) private String provider;
    @Column(length = 100) private String externalWineId;
    @Column(length = 100) private String externalVintageId;
    @Column(length = 1000) private String sourceUrl;
    @Column(length = 200) private String wineNameEn;
    @Column(length = 200) private String wineNameKo;
    @Column(length = 20) private String vintageLabel;
    @Column(length = 60) private String reasonCode;
    @Column(length = 2000) private String reasonMessage;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "spirit_id")
    private Spirit spirit;
}
