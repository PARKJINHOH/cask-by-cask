package com.drinkindex.domain.email.repository;

import com.drinkindex.domain.email.entity.EmailTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmailTemplateRepository extends JpaRepository<EmailTemplate, Long> {
}
