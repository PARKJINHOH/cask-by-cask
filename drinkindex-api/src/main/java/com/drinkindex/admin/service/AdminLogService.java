package com.drinkindex.admin.service;

import com.drinkindex.domain.admin.dto.AdminLogResponse;
import com.drinkindex.domain.admin.entity.AdminLog;
import com.drinkindex.domain.admin.entity.enums.AdminLogTargetType;
import com.drinkindex.domain.admin.entity.enums.AdminLogType;
import com.drinkindex.domain.admin.repository.AdminLogRepository;
import com.drinkindex.domain.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminLogService {

    private final AdminLogRepository adminLogRepository;

    public void record(User actor, AdminLogType logType,
                       AdminLogTargetType targetType, Long targetId,
                       String summary, String detail) {
        adminLogRepository.save(AdminLog.builder()
                .actor(actor)
                .logType(logType)
                .targetType(targetType)
                .targetId(targetId)
                .summary(summary)
                .detail(detail)
                .build());
    }

    @Transactional(readOnly = true)
    public Page<AdminLogResponse> search(List<AdminLogType> logTypes,
                                         String actorNickname,
                                         LocalDateTime from,
                                         LocalDateTime to,
                                         Pageable pageable) {
        List<AdminLogType> types = (logTypes == null || logTypes.isEmpty()) ? null : logTypes;
        String nickname = (actorNickname == null || actorNickname.isBlank()) ? null : actorNickname.trim();
        return adminLogRepository.search(types, nickname, from, to, pageable)
                .map(AdminLogResponse::from);
    }
}
