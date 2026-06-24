package com.caskbycask.global.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.MappedSuperclass;
import lombok.Getter;
import org.hibernate.annotations.Comment;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import org.hibernate.search.mapper.pojo.mapping.definition.annotation.GenericField;
import org.hibernate.search.engine.backend.types.Sortable;

import java.time.LocalDateTime;

@Getter
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class BaseTimeEntity {

    @Comment("생성 일시")
    @CreatedDate
    @Column(updatable = false, nullable = false)
    @GenericField(sortable = Sortable.YES)
    private LocalDateTime createdAt;

    @Comment("수정 일시")
    @LastModifiedDate
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
