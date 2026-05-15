package com.drinkindex.domain.community.repository;

import com.drinkindex.domain.community.entity.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {

    // 수신함: 내가 receiver, 내가 삭제하지 않은 것
    Page<Message> findByReceiverIdAndIsDeletedByReceiverFalseOrderByCreatedAtDesc(
            Long receiverId, Pageable pageable);

    // 발신함: 내가 sender, 내가 삭제하지 않은 것
    Page<Message> findBySenderIdAndIsDeletedBySenderFalseOrderByCreatedAtDesc(
            Long senderId, Pageable pageable);

    // 두 사용자 간의 기존 스레드 조회 (방향 무관)
    @Query("SELECT m FROM Message m WHERE " +
           "(m.sender.id = :uid1 AND m.receiver.id = :uid2) OR " +
           "(m.sender.id = :uid2 AND m.receiver.id = :uid1) " +
           "ORDER BY m.createdAt DESC")
    List<Message> findThreadsBetween(@Param("uid1") Long uid1,
                                     @Param("uid2") Long uid2,
                                     Pageable pageable);
}
