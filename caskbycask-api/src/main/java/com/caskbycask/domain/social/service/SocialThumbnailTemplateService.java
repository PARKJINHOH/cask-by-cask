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
                .displayOrder(request.displayOrder() != null ? request.displayOrder() : 0)
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
                request.displayOrder() != null ? request.displayOrder() : 0);
        return SocialAdminDtos.TemplateResponse.from(template);
    }

    @Transactional
    public void delete(Long id) {
        SocialThumbnailTemplate template = templateRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.SOCIAL_TEMPLATE_NOT_FOUND));
        template.update(template.getName(), template.getBackgroundImageUrl(), false, template.getDisplayOrder());
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
