package com.caskbycask.domain.deal.service;

import com.caskbycask.domain.deal.dto.CreateDealRequest;
import com.caskbycask.domain.deal.entity.DealPost;
import com.caskbycask.domain.deal.entity.enums.DealStatus;
import com.caskbycask.domain.deal.repository.DealPostRepository;
import com.caskbycask.domain.pricetracker.entity.enums.StoreType;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.repository.SpiritRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;

@ExtendWith(MockitoExtension.class)
class DealAdminServiceTest {

    @Mock DealPostRepository dealPostRepository;
    @Mock SpiritRepository spiritRepository;
    @InjectMocks DealAdminService service;

    @Test
    void list_filtersByStatusAndTrimmedDrinkName() {
        given(dealPostRepository
                .findAllByStatusAndDrinkNameContainingIgnoreCaseOrderByCreatedAtDesc(
                        any(DealStatus.class), any(String.class), any(Pageable.class)))
                .willReturn(Page.empty());

        service.list(DealStatus.PENDING, "  발베니  ", 0, 20);

        then(dealPostRepository)
                .should()
                .findAllByStatusAndDrinkNameContainingIgnoreCaseOrderByCreatedAtDesc(
                        org.mockito.ArgumentMatchers.eq(DealStatus.PENDING),
                        org.mockito.ArgumentMatchers.eq("발베니"),
                        any(Pageable.class));
    }

    @Test
    void list_treatsBlankDrinkNameAsNoSearchCondition() {
        given(dealPostRepository.findAllByStatusOrderByCreatedAtDesc(
                any(DealStatus.class), any(Pageable.class)))
                .willReturn(Page.<DealPost>empty());

        service.list(DealStatus.APPROVED, "   ", 0, 20);

        then(dealPostRepository)
                .should()
                .findAllByStatusOrderByCreatedAtDesc(
                        org.mockito.ArgumentMatchers.eq(DealStatus.APPROVED),
                        any(Pageable.class));
    }

    // ─── 관리자 직접 등록 ──────────────────────────────────────

    @Test
    @DisplayName("관리자 직접 등록은 검토 대기를 건너뛰고 바로 승인·노출로 저장한다")
    void create_savesAsApprovedAndVisible() {
        given(spiritRepository.findById(7L)).willReturn(Optional.of(sampleSpirit()));
        given(dealPostRepository.existsBySourceUrl(any(String.class))).willReturn(false);

        service.create(new CreateDealRequest(
                7L, null, null, 700, 120000, 90000,
                null, "트레이더스", null, null, null,
                StoreType.DOMESTIC, "https://example.com/deal/1", LocalDate.of(2026, 7, 30)));

        ArgumentCaptor<DealPost> captor = ArgumentCaptor.forClass(DealPost.class);
        then(dealPostRepository).should().saveAndFlush(captor.capture());
        DealPost saved = captor.getValue();

        assertThat(saved.getStatus()).isEqualTo(DealStatus.APPROVED);
        assertThat(saved.getIsVisible()).isTrue();
        assertThat(saved.getSourceSite()).isEqualTo("ADMIN");
        assertThat(saved.getSourceUrl()).isEqualTo("https://example.com/deal/1");
        // 관측일이 차트 X축이 되므로 crawledAt 으로 저장돼야 한다.
        assertThat(saved.getCrawledAt()).isEqualTo(LocalDate.of(2026, 7, 30).atStartOfDay());
        // 빈 주류명/카테고리는 연결된 주류에서 채운다.
        assertThat(saved.getDrinkName()).isEqualTo("테스트 위스키");
        assertThat(saved.getDrinkCategory()).isEqualTo("WHISKY");
        assertThat(saved.getDiscountRate()).isEqualByComparingTo("0.2500");
        assertThat(saved.getCurrency()).isEqualTo("KRW");
        assertThat(saved.getSpirit()).isNotNull();
    }

    @Test
    @DisplayName("출처 URL 을 비우면 admin:// 내부 멱등키를 생성해 크롤러 UNIQUE 제약을 지킨다")
    void create_generatesInternalSourceUrlWhenBlank() {
        given(spiritRepository.findById(7L)).willReturn(Optional.of(sampleSpirit()));
        given(dealPostRepository.existsBySourceUrl(any(String.class))).willReturn(false);

        service.create(new CreateDealRequest(
                7L, "발베니 12", "WHISKY", null, 100000, 100000,
                "krw", "  ", null, null, null,
                null, "", null));

        ArgumentCaptor<DealPost> captor = ArgumentCaptor.forClass(DealPost.class);
        then(dealPostRepository).should().saveAndFlush(captor.capture());
        DealPost saved = captor.getValue();

        assertThat(saved.getSourceUrl()).startsWith("admin://deal/");
        assertThat(saved.getSeller()).isNull();
        assertThat(saved.getStoreType()).isEqualTo(StoreType.DOMESTIC);
        assertThat(saved.getCrawledAt()).isNotNull();
        // 할인 없는 시세 등록도 허용한다(정상가 == 판매가 → 할인율 0).
        assertThat(saved.getDiscountRate()).isEqualByComparingTo("0.0000");
    }

    @Test
    @DisplayName("연결할 주류가 없으면 등록을 거부한다 — 차트에 집계되지 않는 유령 데이터 방지")
    void create_rejectsUnknownSpirit() {
        given(spiritRepository.findById(99L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> service.create(new CreateDealRequest(
                99L, null, null, null, 1000, 900,
                null, null, null, null, null, null, null, null)))
                .isInstanceOf(CustomException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.SPIRIT_NOT_FOUND);

        then(dealPostRepository).should(never()).saveAndFlush(any(DealPost.class));
    }

    @Test
    @DisplayName("이미 등록된 출처 URL 은 중복으로 거부한다")
    void create_rejectsDuplicateSourceUrl() {
        given(spiritRepository.findById(7L)).willReturn(Optional.of(sampleSpirit()));
        given(dealPostRepository.existsBySourceUrl("https://example.com/deal/1")).willReturn(true);

        assertThatThrownBy(() -> service.create(new CreateDealRequest(
                7L, null, null, null, 1000, 900,
                null, null, null, null, null, null,
                "https://example.com/deal/1", null)))
                .isInstanceOf(CustomException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.DEAL_ALREADY_EXISTS);

        then(dealPostRepository).should(never()).saveAndFlush(any(DealPost.class));
    }

    @Test
    @DisplayName("외화 등록은 거부한다 — 가격 차트가 deal 금액을 환산 없이 원화로 집계하기 때문")
    void create_rejectsForeignCurrency() {
        given(spiritRepository.findById(7L)).willReturn(Optional.of(sampleSpirit()));
        given(dealPostRepository.existsBySourceUrl(any(String.class))).willReturn(false);

        assertThatThrownBy(() -> service.create(new CreateDealRequest(
                7L, null, null, null, 120, 100,
                "USD", null, null, null, null, null, null, null)))
                .isInstanceOf(CustomException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.DEAL_CURRENCY_NOT_SUPPORTED);

        then(dealPostRepository).should(never()).saveAndFlush(any(DealPost.class));
    }

    private Spirit sampleSpirit() {
        return Spirit.builder()
                .id(7L)
                .nameKo("테스트 위스키")
                .nameEn("Test Whisky")
                .category(SpiritCategory.WHISKY)
                .build();
    }
}
