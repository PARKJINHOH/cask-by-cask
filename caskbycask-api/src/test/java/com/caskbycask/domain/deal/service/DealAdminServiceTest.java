package com.caskbycask.domain.deal.service;

import com.caskbycask.domain.deal.entity.DealPost;
import com.caskbycask.domain.deal.entity.enums.DealStatus;
import com.caskbycask.domain.deal.repository.DealPostRepository;
import com.caskbycask.domain.spirit.repository.SpiritRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

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
}
