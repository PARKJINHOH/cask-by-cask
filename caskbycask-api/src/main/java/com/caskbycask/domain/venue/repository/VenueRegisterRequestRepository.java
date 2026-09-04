package com.caskbycask.domain.venue.repository;

import com.caskbycask.domain.spirit.entity.enums.RequestStatus;
import com.caskbycask.domain.venue.entity.VenueRegisterRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface VenueRegisterRequestRepository extends JpaRepository<VenueRegisterRequest, Long> {

    List<VenueRegisterRequest> findAllByUserIdOrderByIdDesc(Long userId);

    /** 관리자 목록. 상태를 비우면 전부 본다. */
    @Query(value = """
            select r from VenueRegisterRequest r
            join fetch r.user
            where (:status is null or r.status = :status)
            order by r.id desc
            """,
            countQuery = """
            select count(r) from VenueRegisterRequest r
            where (:status is null or r.status = :status)
            """)
    Page<VenueRegisterRequest> findForAdmin(@Param("status") RequestStatus status, Pageable pageable);
}
