package com.caskbycask.domain.spirit.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "spirit_common_detail")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("주류 공통 상세")
public class SpiritCommonDetail {

    @Id
    @Comment("주류(spirit.id, PK)")
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "spirit_id")
    private Spirit spirit;

    /** NAS = No Age Statement. true이면 ageStatement 무시. */
    @Builder.Default
    @Column(nullable = false)
    @Comment("NAS(숙성연수 미표기) 여부")
    private Boolean isNas = false;

    /** 직접 입력 숙성 연수. isNas=true 저장 시 서버에서 강제 null. */
    @Column
    @Comment("숙성 연수(년)")
    private Integer ageStatement;

    @Column(name = "age_statement_min")
    @Comment("최소 숙성 연수(년)")
    private Integer ageStatementMin;

    @Column(name = "age_statement_max")
    @Comment("최대 숙성 연수(년)")
    private Integer ageStatementMax;

    /** 형식: "YYYY" or "YYYY-MM" — 연도만 아는 경우를 위해 String 사용 */
    @Column(length = 7)
    @Comment("증류 연월(YYYY-MM)")
    private String distilledDate;

    @Column(length = 7)
    @Comment("병입 연월(YYYY-MM)")
    private String bottledDate;

    /** 출시일은 정확한 날짜가 있는 경우가 많으므로 DATE 타입 사용 */
    @Column
    @Comment("출시일")
    private LocalDate releaseDate;

    @Column
    @Comment("용량(ml)")
    private Integer volumeMl;

    @Column(precision = 4, scale = 1)
    @Comment("도수(%)")
    private BigDecimal abv;

    /** 예: "123/500" 형태 자유 입력 */
    @Column(length = 50)
    @Comment("보틀 번호")
    private String bottleNo;

    @Column(length = 100)
    @Comment("배치 번호")
    private String batchNo;

    @Column
    @Comment("총 병입 수량")
    private Integer totalBottles;

    public void update(boolean isNas, Integer ageStatement, Integer ageStatementMin, Integer ageStatementMax,
                       String distilledDate, String bottledDate, java.time.LocalDate releaseDate,
                       Integer volumeMl, java.math.BigDecimal abv,
                       String bottleNo, String batchNo, Integer totalBottles) {
        this.isNas            = isNas;
        this.ageStatement     = isNas ? null : ageStatement;
        this.ageStatementMin  = isNas ? null : ageStatementMin;
        this.ageStatementMax  = isNas ? null : ageStatementMax;
        this.distilledDate    = distilledDate;
        this.bottledDate      = bottledDate;
        this.releaseDate      = releaseDate;
        this.volumeMl         = volumeMl;
        this.abv              = abv;
        this.bottleNo         = bottleNo;
        this.batchNo          = batchNo;
        this.totalBottles     = totalBottles;
    }
}
