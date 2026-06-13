package com.caskbycask.domain.inquiry.repository;

import com.caskbycask.domain.inquiry.entity.Inquiry;
import com.caskbycask.domain.inquiry.entity.enums.InquiryCategory;
import com.caskbycask.domain.inquiry.entity.enums.InquiryStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InquiryRepository extends JpaRepository<Inquiry, Long> {
    Page<Inquiry> findByStatus(InquiryStatus status, Pageable pageable);
    Page<Inquiry> findByCategory(InquiryCategory category, Pageable pageable);
    Page<Inquiry> findByStatusAndCategory(InquiryStatus status, InquiryCategory category, Pageable pageable);
    long countByStatusNot(InquiryStatus status);
}
