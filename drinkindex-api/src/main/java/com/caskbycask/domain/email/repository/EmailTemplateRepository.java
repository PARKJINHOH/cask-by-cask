package com.caskbycask.domain.email.repository;

import com.caskbycask.domain.email.entity.EmailTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmailTemplateRepository extends JpaRepository<EmailTemplate, Long> {
}
