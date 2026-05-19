package com.drinkindex.domain.inquiry.repository;

import com.drinkindex.domain.inquiry.entity.Inquiry;
import com.drinkindex.domain.inquiry.entity.enums.InquiryCategory;
import com.drinkindex.domain.inquiry.entity.enums.InquiryStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InquiryRepository extends JpaRepository<Inquiry, Long> {
    Page<Inquiry> findByStatus(InquiryStatus status, Pageable pageable);
    Page<Inquiry> findByCategory(InquiryCategory category, Pageable pageable);
    Page<Inquiry> findByStatusAndCategory(InquiryStatus status, InquiryCategory category, Pageable pageable);
    long countByStatusNot(InquiryStatus status);
}
