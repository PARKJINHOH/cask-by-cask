package com.caskbycask.domain.feedback.repository;

import com.caskbycask.domain.feedback.entity.FeedbackComment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FeedbackCommentRepository extends JpaRepository<FeedbackComment, Long> {

    List<FeedbackComment> findByFeedbackIdOrderByCreatedAtAsc(Long feedbackId);
}
