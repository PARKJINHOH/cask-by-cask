package com.drinkindex.domain.cognacappellation.entity;

import com.drinkindex.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "cognac_appellation")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class CognacAppellation extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String nameKo;

    @Column(nullable = false, length = 100)
    private String nameEn;

    @Column(columnDefinition = "TEXT")
    private String descriptionKo;

    @Column(columnDefinition = "TEXT")
    private String descriptionEn;

    public void update(String nameKo, String nameEn, String descriptionKo, String descriptionEn) {
        this.nameKo = nameKo;
        this.nameEn = nameEn;
        this.descriptionKo = descriptionKo;
        this.descriptionEn = descriptionEn;
    }
}
