package com.caskbycask.domain.social.service;

import com.caskbycask.domain.social.dto.SocialAdminDtos;
import com.caskbycask.domain.social.entity.SocialThumbnailTemplate;
import com.caskbycask.domain.social.repository.SocialThumbnailTemplateRepository;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SocialThumbnailTemplateService {

    private final SocialThumbnailTemplateRepository templateRepository;
    private final UserRepository userRepository;
    private final SocialImageRenderService imageRenderService;

    @Transactional(readOnly = true)
    public List<SocialAdminDtos.TemplateResponse> activeTemplates() {
        return templateRepository.findByActiveTrueOrderByDisplayOrderAscIdAsc().stream()
                .map(SocialAdminDtos.TemplateResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<SocialAdminDtos.TemplateResponse> allTemplates() {
        return templateRepository.findAllByOrderByDisplayOrderAscIdAsc().stream()
                .map(SocialAdminDtos.TemplateResponse::from).toList();
    }

    @Transactional
    public SocialAdminDtos.TemplateResponse create(
            SocialAdminDtos.TemplateRequest request, Long userId) {
        SocialThumbnailTemplate template = templateRepository.save(SocialThumbnailTemplate.builder()
                .name(request.name().trim())
                .backgroundImageUrl(request.backgroundImageUrl().trim())
                .active(request.active() == null || request.active())
                // 순서는 목록에서 드래그로만 바꾼다. 신규 배경은 항상 맨 아래.
                .displayOrder(nextDisplayOrder())
                .createdBy(userRepository.getByIdOrThrow(userId))
                .build());
        return SocialAdminDtos.TemplateResponse.from(template);
    }

    @Transactional
    public SocialAdminDtos.TemplateResponse update(
            Long id, SocialAdminDtos.TemplateRequest request) {
        SocialThumbnailTemplate template = templateRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.SOCIAL_TEMPLATE_NOT_FOUND));
        template.update(request.name().trim(), request.backgroundImageUrl().trim(),
                request.active() == null || request.active(),
                template.getDisplayOrder());
        return SocialAdminDtos.TemplateResponse.from(template);
    }

    /**
     * 목록에 보이는 순서대로 id 를 받아 그대로 displayOrder 로 굳힌다(배열 index = displayOrder).
     * 사용자 썸네일 배경 선택 목록이 이 순서를 따른다.
     */
    @Transactional
    public void reorder(List<Long> orderedIds) {
        if (orderedIds == null || orderedIds.isEmpty()) return;
        List<SocialThumbnailTemplate> templates = templateRepository.findAllById(orderedIds);
        if (templates.size() != orderedIds.size()) {
            throw new CustomException(ErrorCode.SOCIAL_TEMPLATE_NOT_FOUND);
        }
        for (SocialThumbnailTemplate template : templates) {
            template.update(template.getName(), template.getBackgroundImageUrl(),
                    template.isActive(), orderedIds.indexOf(template.getId()));
        }
    }

    @Transactional
    public void delete(Long id) {
        SocialThumbnailTemplate template = templateRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.SOCIAL_TEMPLATE_NOT_FOUND));
        template.update(template.getName(), template.getBackgroundImageUrl(), false, template.getDisplayOrder());
    }

    /** 가장 큰 displayOrder 다음 값 — 신규 배경은 목록 맨 아래로 간다. */
    private int nextDisplayOrder() {
        return templateRepository.findAllByOrderByDisplayOrderAscIdAsc().stream()
                .mapToInt(SocialThumbnailTemplate::getDisplayOrder)
                .max()
                .orElse(-1) + 1;
    }

    public SocialAdminDtos.ImageUploadResponse uploadBackground(MultipartFile file) {
        return new SocialAdminDtos.ImageUploadResponse(
                imageRenderService.storeTemplateBackground(file),
                SocialImageRenderService.WIDTH,
                SocialImageRenderService.HEIGHT
        );
    }

    public SocialAdminDtos.ImageUploadResponse uploadDirect(MultipartFile file) {
        return new SocialAdminDtos.ImageUploadResponse(
                imageRenderService.storeDirectUpload(file),
                SocialImageRenderService.WIDTH,
                SocialImageRenderService.HEIGHT
        );
    }
}
