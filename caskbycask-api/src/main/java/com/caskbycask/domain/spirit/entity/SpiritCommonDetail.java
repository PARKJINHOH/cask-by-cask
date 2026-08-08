package com.caskbycask.domain.spirit.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

import java.math.BigDecimal;

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

    @Column(name = "age_statement_months")
    @Comment("숙성 개월(0~11) — 단일 연수의 추가 개월")
    private Integer ageStatementMonths;

    /** 형식: "YYYY" or "YYYY-MM" — 연도만 아는 경우를 위해 String 사용 */
    @Column(length = 7)
    @Comment("증류 연월(YYYY-MM)")
    private String distilledDate;

    @Column(length = 7)
    @Comment("병입 연월(YYYY-MM)")
    private String bottledDate;

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

    @Column
    @Comment("총 병입 수량")
    private Integer totalBottles;

    public void update(boolean isNas, Integer ageStatement, Integer ageStatementMonths,
                       String distilledDate, String bottledDate,
                       Integer volumeMl, java.math.BigDecimal abv,
                       String bottleNo, Integer totalBottles) {
        this.isNas             = isNas;
        this.ageStatement      = isNas ? null : ageStatement;
        this.ageStatementMonths = isNas ? null : ageStatementMonths;
        this.distilledDate    = distilledDate;
        this.bottledDate      = bottledDate;
        this.volumeMl         = volumeMl;
        this.abv              = abv;
        this.bottleNo         = bottleNo;
        this.totalBottles     = totalBottles;
    }
}
