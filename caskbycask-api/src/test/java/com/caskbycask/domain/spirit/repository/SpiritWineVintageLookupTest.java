package com.caskbycask.domain.spirit.repository;

import com.caskbycask.domain.producer.entity.Producer;
import com.caskbycask.domain.producer.entity.ProducerType;
import com.caskbycask.domain.producer.repository.ProducerRepository;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.SpiritStatus;
import com.caskbycask.global.config.JpaAuditingConfig;
import com.caskbycask.global.config.QuerydslConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** 와이너리가 선택값이 된 뒤 생산자 없는 와인도 중복 조회에 걸리는지 실제 SQL로 확인한다. */
@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({QuerydslConfig.class, JpaAuditingConfig.class})
class SpiritWineVintageLookupTest {

    @Autowired private SpiritRepository spiritRepository;
    @Autowired private ProducerRepository producerRepository;

    @Test
    void 생산자가_없는_와인은_producerId_null로_찾는다() {
        spiritRepository.save(wine("Chateau Test", 2020, null));

        List<Spirit> found = spiritRepository.findExistingWineVintage(null, "chateau test", 2020, false);

        assertThat(found).hasSize(1);
        assertThat(found.get(0).getProducer()).isNull();
    }

    @Test
    void producerId_null_조회가_생산자_있는_와인을_끌어오지_않는다() {
        Producer winery = producerRepository.save(Producer.builder()
                .type(ProducerType.WINERY).nameKo("예시 와이너리").nameEn("Example Winery")
                .country("프랑스").build());
        spiritRepository.save(wine("Chateau Test", 2020, winery));

        assertThat(spiritRepository.findExistingWineVintage(null, "Chateau Test", 2020, false)).isEmpty();
        assertThat(spiritRepository.findExistingWineVintage(winery.getId(), "Chateau Test", 2020, false))
                .hasSize(1);
    }

    @Test
    void 생산자_있는_와인_조회는_생산자_없는_와인을_끌어오지_않는다() {
        Producer winery = producerRepository.save(Producer.builder()
                .type(ProducerType.WINERY).nameKo("예시 와이너리").nameEn("Example Winery")
                .country("프랑스").build());
        spiritRepository.save(wine("Chateau Test", 2020, null));

        assertThat(spiritRepository.findExistingWineVintage(winery.getId(), "Chateau Test", 2020, false))
                .isEmpty();
    }

    private static Spirit wine(String nameEn, Integer vintageYear, Producer producer) {
        return Spirit.builder()
                .nameKo(nameEn).nameEn(nameEn)
                .category(SpiritCategory.WINE).status(SpiritStatus.HIDDEN)
                .producer(producer).vintageYear(vintageYear)
                .build();
    }
}
