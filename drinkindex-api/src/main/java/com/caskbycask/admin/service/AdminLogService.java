package com.caskbycask.admin.service;

import com.caskbycask.domain.admin.dto.AdminLogResponse;
import com.caskbycask.domain.admin.entity.AdminLog;
import com.caskbycask.domain.admin.entity.enums.AdminLogTargetType;
import com.caskbycask.domain.admin.entity.enums.AdminLogType;
import com.caskbycask.domain.admin.repository.AdminLogRepository;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.repository.UserRepository;
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
    private final UserRepository userRepository;

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
                                         String actorEmail,
                                         LocalDateTime from,
                                         LocalDateTime to,
                                         Pageable pageable) {
        List<AdminLogType> types = (logTypes == null || logTypes.isEmpty()) ? null : logTypes;
        String email = (actorEmail == null || actorEmail.isBlank()) ? null : actorEmail.trim();
        return adminLogRepository.search(types, email, from, to, pageable)
                .map(log -> {
                    String targetUserEmail = null;
                    if (log.getTargetType() == AdminLogTargetType.USER) {
                        targetUserEmail = userRepository.findEmailById(log.getTargetId()).orElse(null);
                    }
                    return AdminLogResponse.from(log, targetUserEmail);
                });
    }
}
