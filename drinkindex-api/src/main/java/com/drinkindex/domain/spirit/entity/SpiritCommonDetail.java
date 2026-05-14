package com.drinkindex.domain.spirit.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "spirit_common_detail")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class SpiritCommonDetail {

    @Id
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "spirit_id")
    private Spirit spirit;

    /** NAS = No Age Statement. true이면 ageStatement 무시. */
    @Builder.Default
    @Column(nullable = false)
    private Boolean isNas = false;

    /** 직접 입력 숙성 연수. isNas=true 저장 시 서버에서 강제 null. */
    @Column
    private Integer ageStatement;

    /** 형식: "YYYY" or "YYYY-MM" — 연도만 아는 경우를 위해 String 사용 */
    @Column(length = 7)
    private String distilledDate;

    @Column(length = 7)
    private String bottledDate;

    /** 출시일은 정확한 날짜가 있는 경우가 많으므로 DATE 타입 사용 */
    @Column
    private LocalDate releaseDate;

    @Column
    private Integer volumeMl;

    @Column(precision = 4, scale = 1)
    private BigDecimal abv;

    /** 예: "123/500" 형태 자유 입력 */
    @Column(length = 50)
    private String bottleNo;

    @Column(length = 100)
    private String batchNo;

    @Column
    private Integer totalBottles;

    public void update(boolean isNas, Integer ageStatement, String distilledDate,
                       String bottledDate, java.time.LocalDate releaseDate,
                       Integer volumeMl, java.math.BigDecimal abv,
                       String bottleNo, String batchNo, Integer totalBottles) {
        this.isNas         = isNas;
        this.ageStatement  = isNas ? null : ageStatement;
        this.distilledDate = distilledDate;
        this.bottledDate   = bottledDate;
        this.releaseDate   = releaseDate;
        this.volumeMl      = volumeMl;
        this.abv           = abv;
        this.bottleNo      = bottleNo;
        this.batchNo       = batchNo;
        this.totalBottles  = totalBottles;
    }
}
