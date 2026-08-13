package com.caskbycask.domain.photocard.service;

import com.caskbycask.domain.photocard.dto.*;
import com.caskbycask.domain.photocard.entity.PhotoCardImage;
import com.caskbycask.domain.photocard.entity.PhotoCardTemplate;
import com.caskbycask.domain.photocard.entity.enums.PhotoCardModerationStatus;
import com.caskbycask.domain.photocard.entity.enums.PhotoCardTemplateType;
import com.caskbycask.domain.photocard.repository.PhotoCardImageRepository;
import com.caskbycask.domain.photocard.repository.PhotoCardTemplateRepository;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import com.caskbycask.global.storage.FileStorageService;
import com.caskbycask.global.storage.ValidatedImageUploader;
import com.caskbycask.global.storage.ValidatedImageUploader.StoredImage;
import com.caskbycask.global.util.BadWordFilter;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 포토카드 템플릿 저장·조회.
 * <p>
 * 검증 전략은 {@code TasteTreeService} 를 따른다 — 상한 상수를 두고, 저장 직전에 normalize 해서
 * 클라이언트가 보낸 값(특히 schemaVersion)을 그대로 믿지 않는다.
 */
@Service
@RequiredArgsConstructor
public class PhotoCardTemplateService {

    /** 레이아웃 스키마 버전. 구조를 바꾸면 올리고 마이그레이션 규칙을 함께 넣는다. */
    public static final int SCHEMA_VERSION = 3;

    private static final int MAX_LAYERS = 64;
    /** 리뷰 전문처럼 긴 글도 담을 수 있는 길이. 프론트 PHOTO_CARD_MAX_TEXT_LENGTH 와 같아야 한다. */
    private static final int MAX_TEXT_LENGTH = 600;
    private static final int MAX_TEMPLATES_PER_USER = 30;
    private static final double MIN_FONT_SIZE_RATIO = 0.005;
    private static final double MAX_FONT_SIZE_RATIO = 0.30;
    /**
     * 한 변에 더할 수 있는 최대 카드 확장 — 기준 프레임 짧은 변 대비.
     * 프론트 {@code layoutSchema.ts} 의 PHOTO_CARD_MAX_EXTEND 와 같아야 한다.
     */
    private static final double MAX_EXTEND = 1.0;
    /** 긴 리뷰 카드 전용으로 하단 방향은 더 길게 확장할 수 있다. */
    private static final double MAX_BOTTOM_EXTEND = 3.0;

    private static final Pattern HEX_COLOR = Pattern.compile("^#[0-9a-fA-F]{6}$");
    /** 반투명을 허용하는 자리(박스 채움)는 8자리도 받는다. */
    private static final Pattern HEX_COLOR_ALPHA = Pattern.compile("^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$");

    /**
     * 카드 비율 — {@code 가로:세로}.
     * <p>
     * 프리셋(1:1·4:5·3:4·9:16·16:9) 말고 사진에 맞춘 값·직접 적은 값도 온다. 형식만 맞으면 받고
     * 범위로 한 번 더 거른다. 네 자리까지만 받는 것은 {@code aspect_ratio} 열(varchar 12) 때문이다.
     * 프론트 {@code photoCardRatios.ts} 의 RATIO_PATTERN 과 같아야 한다.
     */
    private static final Pattern RATIO_PATTERN = Pattern.compile("^([1-9]\\d{0,3}):([1-9]\\d{0,3})$");
    /**
     * 비율 상·하한. 프론트 PHOTO_CARD_MIN/MAX_RATIO_VALUE 와 같아야 한다.
     * 파노라마를 그대로 받으면 짧은 변이 글자를 얹을 수 없을 만큼 줄어든다.
     */
    private static final double MIN_RATIO_VALUE = 0.25;
    private static final double MAX_RATIO_VALUE = 4.0;

    private static final Set<String> LAYER_TYPES = Set.of("TEXT", "IMAGE", "DIVIDER", "BOX", "ICON");

    /**
     * 아이콘 키 화이트리스트. 프론트 {@code photoCardIcons.ts} 의 key 와 같아야 한다.
     * 여기 없는 키가 오면 캔버스에 아무것도 안 그려지므로 저장 단계에서 막는다.
     */
    private static final Set<String> ICON_KEYS = Set.of(
            "mapPin", "gps", "whisky", "bottle", "camera", "aperture",
            "calendar", "star", "heart", "barrel", "quote", "divider"
    );
    private static final Set<String> PHOTO_FITS = Set.of("COVER", "CONTAIN");
    private static final Set<String> IMAGE_SOURCES = Set.of(
            "PRODUCER_LOGO", "SPIRIT_IMAGE", "UPLOAD",
            "REVIEW_AROMA_NOSE", "REVIEW_AROMA_TASTE", "REVIEW_AROMA_FINISH"
    );

    /**
     * 프론트 {@code imageEditorText.ts} 의 TEXT_FONT_OPTIONS 와 같아야 한다.
     * 여기 없는 키가 오면 브라우저마다 다른 시스템 폰트로 렌더되므로 거부한다.
     */
    private static final Set<String> FONT_KEYS = Set.of(
            "pretendardRegular", "pretendardMedium", "pretendardBold", "pretendardBlack",
            "notoSansKrLight", "notoSansKrRegular", "notoSansKrMedium", "notoSansKrBold",
            "gowunDodum",
            "blackHanSans", "doHyeon", "jua", "nanumPenScript",
            "gowunBatang", "gowunBatangBold", "songMyung",
            // 영문 위주 서체
            "wantedSansExtraBold", "ibmPlexSansCondBold", "bebasNeue", "pacifico",
            "stiluSemiBold", "stiluBold", "kalamkari", "coolStory", "magnoliaScript", "exmouth",
            "allura", "greatVibes", "dancingScript", "dancingScriptBold"
    );

    private final PhotoCardTemplateRepository templateRepository;
    private final PhotoCardImageRepository imageRepository;
    private final UserRepository userRepository;
    private final ValidatedImageUploader validatedImageUploader;
    private final FileStorageService fileStorageService;
    private final BadWordFilter badWordFilter;
    private final ObjectMapper objectMapper;

    // ═══════════════════════════════════════════
    // 조회
    // ═══════════════════════════════════════════

    /** 공식 템플릿 — 비로그인도 볼 수 있다. */
    @Transactional(readOnly = true)
    public List<PhotoCardTemplateResponse> getOfficialTemplates(Long viewerUserId) {
        return templateRepository
                .findByTemplateTypeAndModerationStatusOrderByDisplayOrderAscIdAsc(
                        PhotoCardTemplateType.OFFICIAL, PhotoCardModerationStatus.VISIBLE)
                .stream()
                .map(template -> toResponse(template, viewerUserId))
                .toList();
    }

    /** 내 템플릿 — 비공개 포함. */
    @Transactional(readOnly = true)
    public List<PhotoCardTemplateResponse> getMyTemplates(Long userId) {
        return templateRepository.findAllOwnedBy(userId).stream()
                .map(template -> toResponse(template, userId))
                .toList();
    }

    /** 공개된 사용자 템플릿 — 조회자의 공개 템플릿도 포함한다. */
    @Transactional(readOnly = true)
    public List<PhotoCardTemplateResponse> getPublicTemplates(Long viewerUserId) {
        return templateRepository.findPublicUserTemplates().stream()
                .map(template -> toResponse(template, viewerUserId))
                .toList();
    }

    @Transactional(readOnly = true)
    public PhotoCardTemplateResponse getTemplate(Long id, Long viewerUserId) {
        PhotoCardTemplate template = templateRepository.findByIdWithOwner(id)
                .orElseThrow(() -> new CustomException(ErrorCode.PHOTO_CARD_TEMPLATE_NOT_FOUND));
        boolean mine = viewerUserId != null && template.isOwnedBy(viewerUserId);
        if (!mine && !template.isUsableByOthers()) {
            // 존재 자체를 숨긴다 — 비공개 템플릿의 id 를 훑어 존재 여부를 알아내지 못하게.
            throw new CustomException(ErrorCode.PHOTO_CARD_TEMPLATE_NOT_FOUND);
        }
        return toResponse(template, viewerUserId);
    }

    // ═══════════════════════════════════════════
    // 사용자 템플릿
    // ═══════════════════════════════════════════

    @Transactional
    public PhotoCardTemplateResponse createMyTemplate(PhotoCardTemplateSaveRequest request, Long userId) {
        if (templateRepository.countByTemplateTypeAndOwnerId(PhotoCardTemplateType.USER, userId)
                >= MAX_TEMPLATES_PER_USER) {
            throw new CustomException(ErrorCode.PHOTO_CARD_TEMPLATE_LIMIT_EXCEEDED);
        }
        User owner = userRepository.getByIdOrThrow(userId);
        PhotoCardLayout layout = normalize(request.layout());
        validateTexts(request, layout);

        PhotoCardTemplate template = PhotoCardTemplate.builder()
                .templateType(PhotoCardTemplateType.USER)
                .owner(owner)
                .createdBy(owner)
                .name(request.name())
                .description(request.description())
                .aspectRatio(layout.frame().ratio())
                .schemaVersion(SCHEMA_VERSION)
                .layoutJson(writeJson(layout))
                .thumbnailUrl(request.thumbnailUrl())
                .thumbnailSavedFileName(request.thumbnailSavedFileName())
                .thumbnailSubPath(request.thumbnailSubPath())
                .isPublic(Boolean.TRUE.equals(request.isPublic()))
                .moderationStatus(PhotoCardModerationStatus.VISIBLE)
                .displayOrder(0)
                .useCount(0L)
                .build();

        return toResponse(templateRepository.save(template), userId);
    }

    @Transactional
    public PhotoCardTemplateResponse updateMyTemplate(Long id, PhotoCardTemplateSaveRequest request, Long userId) {
        PhotoCardTemplate template = findOwnedTemplate(id, userId);
        PhotoCardLayout layout = normalize(request.layout());
        validateTexts(request, layout);

        String previousFile = template.getThumbnailSavedFileName();
        String previousPath = template.getThumbnailSubPath();

        template.update(request.name(), request.description(), layout.frame().ratio(),
                SCHEMA_VERSION, writeJson(layout));
        if (request.thumbnailUrl() != null) {
            template.updateThumbnail(request.thumbnailUrl(), request.thumbnailSavedFileName(),
                    request.thumbnailSubPath());
            if (!java.util.Objects.equals(previousFile, request.thumbnailSavedFileName())) {
                deleteFileAfterCommit(previousFile, previousPath);
            }
        }
        if (request.isPublic() != null) {
            template.changePublic(request.isPublic());
        }
        return toResponse(template, userId);
    }

    /** 공개 토글 — 사용자 제작물을 다른 사용자에게 열고 닫는다. */
    @Transactional
    public PhotoCardTemplateResponse toggleMyTemplatePublic(Long id, boolean isPublic, Long userId) {
        PhotoCardTemplate template = findOwnedTemplate(id, userId);
        template.changePublic(isPublic);
        return toResponse(template, userId);
    }

    @Transactional
    public void deleteMyTemplate(Long id, Long userId) {
        PhotoCardTemplate template = findOwnedTemplate(id, userId);
        String fileName = template.getThumbnailSavedFileName();
        String subPath = template.getThumbnailSubPath();
        templateRepository.delete(template);
        // MediaCleanupBatch 는 게시글 이미지만 정리하므로 여기서 직접 지운다.
        deleteFileAfterCommit(fileName, subPath);
    }

    /** 사용 횟수 +1 — 공개 템플릿 정렬(인기순)의 근거가 된다. */
    @Transactional
    public void markUsed(Long id, Long viewerUserId) {
        PhotoCardTemplate template = templateRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.PHOTO_CARD_TEMPLATE_NOT_FOUND));
        boolean mine = viewerUserId != null && template.isOwnedBy(viewerUserId);
        if (!mine && !template.isUsableByOthers()) {
            throw new CustomException(ErrorCode.PHOTO_CARD_TEMPLATE_NOT_FOUND);
        }
        template.increaseUseCount();
    }

    // ═══════════════════════════════════════════
    // 관리자 (공식 템플릿 + 공개 사용자 템플릿 모더레이션)
    // ═══════════════════════════════════════════

    @Transactional(readOnly = true)
    public List<PhotoCardTemplateResponse> getOfficialTemplatesForAdmin() {
        return templateRepository
                .findByTemplateTypeOrderByDisplayOrderAscIdAsc(PhotoCardTemplateType.OFFICIAL)
                .stream()
                .map(template -> toResponse(template, null))
                .toList();
    }

    @Transactional(readOnly = true)
    public Page<PhotoCardTemplateResponse> getPublicUserTemplatesForAdmin(Pageable pageable) {
        return templateRepository.findPublicUserTemplatesForAdmin(pageable)
                .map(template -> toResponse(template, null));
    }

    @Transactional
    public PhotoCardTemplateResponse createOfficialTemplate(PhotoCardTemplateSaveRequest request, Long adminId) {
        User admin = userRepository.getByIdOrThrow(adminId);
        PhotoCardLayout layout = normalize(request.layout());

        PhotoCardTemplate template = PhotoCardTemplate.builder()
                .templateType(PhotoCardTemplateType.OFFICIAL)
                .owner(null)
                .createdBy(admin)
                .name(request.name())
                .description(request.description())
                .aspectRatio(layout.frame().ratio())
                .schemaVersion(SCHEMA_VERSION)
                .layoutJson(writeJson(layout))
                .thumbnailUrl(request.thumbnailUrl())
                .thumbnailSavedFileName(request.thumbnailSavedFileName())
                .thumbnailSubPath(request.thumbnailSubPath())
                .isPublic(true)
                .moderationStatus(PhotoCardModerationStatus.VISIBLE)
                // 순서는 목록에서 드래그로만 바꾼다. 신규 공식 템플릿은 항상 맨 아래.
                .displayOrder(nextOfficialDisplayOrder())
                .useCount(0L)
                .build();

        return toResponse(templateRepository.save(template), null);
    }

    /** 공식 템플릿 중 가장 큰 displayOrder 다음 값 — 신규는 목록 맨 아래로 간다. */
    private int nextOfficialDisplayOrder() {
        return templateRepository
                .findByTemplateTypeOrderByDisplayOrderAscIdAsc(PhotoCardTemplateType.OFFICIAL).stream()
                .mapToInt(PhotoCardTemplate::getDisplayOrder)
                .max()
                .orElse(-1) + 1;
    }

    @Transactional
    public PhotoCardTemplateResponse updateOfficialTemplate(Long id, PhotoCardTemplateSaveRequest request) {
        PhotoCardTemplate template = findOfficialTemplate(id);
        PhotoCardLayout layout = normalize(request.layout());

        String previousFile = template.getThumbnailSavedFileName();
        String previousPath = template.getThumbnailSubPath();

        template.update(request.name(), request.description(), layout.frame().ratio(),
                SCHEMA_VERSION, writeJson(layout));
        if (request.thumbnailUrl() != null) {
            template.updateThumbnail(request.thumbnailUrl(), request.thumbnailSavedFileName(),
                    request.thumbnailSubPath());
            if (!java.util.Objects.equals(previousFile, request.thumbnailSavedFileName())) {
                deleteFileAfterCommit(previousFile, previousPath);
            }
        }
        return toResponse(template, null);
    }

    @Transactional
    public void reorderOfficialTemplates(List<Long> orderedIds) {
        if (orderedIds == null || orderedIds.isEmpty()) return;
        List<PhotoCardTemplate> templates = templateRepository.findAllById(orderedIds);
        for (PhotoCardTemplate template : templates) {
            if (template.getTemplateType() != PhotoCardTemplateType.OFFICIAL) {
                throw new CustomException(ErrorCode.PHOTO_CARD_TEMPLATE_NOT_FOUND);
            }
            template.changeDisplayOrder(orderedIds.indexOf(template.getId()));
        }
    }

    /** 관리자 숨김/복구 — 공개된 사용자 템플릿과 공식 템플릿 모두에 쓴다. */
    @Transactional
    public PhotoCardTemplateResponse changeModeration(Long id, PhotoCardModerationStatus status) {
        PhotoCardTemplate template = templateRepository.findByIdWithOwner(id)
                .orElseThrow(() -> new CustomException(ErrorCode.PHOTO_CARD_TEMPLATE_NOT_FOUND));
        template.changeModerationStatus(status);
        return toResponse(template, null);
    }

    @Transactional
    public void deleteTemplateByAdmin(Long id) {
        PhotoCardTemplate template = templateRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.PHOTO_CARD_TEMPLATE_NOT_FOUND));
        String fileName = template.getThumbnailSavedFileName();
        String subPath = template.getThumbnailSubPath();
        templateRepository.delete(template);
        deleteFileAfterCommit(fileName, subPath);
    }

    // ═══════════════════════════════════════════
    // 이미지 업로드
    // ═══════════════════════════════════════════

    /**
     * 템플릿 미리보기 / UPLOAD 레이어 이미지. 로고·워터마크가 뭉개지지 않게 무손실로 저장한다.
     * <p>서빙 URL 에 연월 디렉토리가 없으므로 저장 경로를 표에 남긴다.
     */
    @Transactional
    public PhotoCardImageUploadResponse uploadImage(MultipartFile file, Long uploaderId) {
        StoredImage stored = validatedImageUploader.uploadLossless(file, "photo-cards");
        User uploader = uploaderId != null ? userRepository.getByIdOrThrow(uploaderId) : null;

        imageRepository.save(PhotoCardImage.builder()
                .savedFileName(stored.savedFileName())
                .subPath(stored.subPath())
                .mimeType(stored.mimeType())
                .imageUrl(stored.imageUrl())
                .originalFileName(file.getOriginalFilename() != null ? file.getOriginalFilename() : "image")
                .fileSize(file.getSize())
                .uploadedBy(uploader)
                .build());

        return new PhotoCardImageUploadResponse(
                stored.imageUrl(), stored.savedFileName(), stored.subPath());
    }

    // ═══════════════════════════════════════════
    // 접근 제어 / 검증 / 직렬화
    // ═══════════════════════════════════════════

    private PhotoCardTemplate findOwnedTemplate(Long id, Long userId) {
        return templateRepository.findOwnedById(id, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.PHOTO_CARD_TEMPLATE_ACCESS_DENIED));
    }

    private PhotoCardTemplate findOfficialTemplate(Long id) {
        PhotoCardTemplate template = templateRepository.findByIdWithOwner(id)
                .orElseThrow(() -> new CustomException(ErrorCode.PHOTO_CARD_TEMPLATE_NOT_FOUND));
        if (template.getTemplateType() != PhotoCardTemplateType.OFFICIAL) {
            throw new CustomException(ErrorCode.PHOTO_CARD_TEMPLATE_NOT_FOUND);
        }
        return template;
    }

    /** 사용자가 쓴 문구(템플릿 이름·설명·텍스트 레이어)는 공개될 수 있으므로 금칙어를 검사한다. */
    private void validateTexts(PhotoCardTemplateSaveRequest request, PhotoCardLayout layout) {
        List<String> texts = new ArrayList<>();
        texts.add(request.name());
        if (request.description() != null) texts.add(request.description());
        for (PhotoCardLayout.Layer layer : layout.layers()) {
            if (layer.text() != null) texts.add(layer.text());
        }
        badWordFilter.validate(texts.toArray(new String[0]));
    }

    /**
     * 검증 + 정규화. 저장되는 것은 언제나 이 결과다.
     * <p>클라이언트가 보낸 schemaVersion 은 버리고 서버 상수를 쓴다.
     */
    private PhotoCardLayout normalize(PhotoCardLayout layout) {
        if (layout == null || layout.frame() == null || layout.layers() == null) {
            throw invalid("레이아웃 구조가 올바르지 않습니다.");
        }
        PhotoCardLayout.Frame frame = normalizeFrame(layout.frame());

        if (layout.layers().size() > MAX_LAYERS) {
            throw invalid("요소는 최대 " + MAX_LAYERS + "개까지 넣을 수 있습니다.");
        }
        List<PhotoCardLayout.Layer> layers = new ArrayList<>(layout.layers().size());
        Set<String> seenIds = new java.util.HashSet<>();
        for (PhotoCardLayout.Layer layer : layout.layers()) {
            PhotoCardLayout.Layer normalized = normalizeLayer(layer);
            if (!seenIds.add(normalized.id())) {
                throw invalid("요소 식별자가 중복됩니다.");
            }
            layers.add(normalized);
        }
        return new PhotoCardLayout(SCHEMA_VERSION, frame, layers);
    }

    private PhotoCardLayout.Frame normalizeFrame(PhotoCardLayout.Frame frame) {
        String ratio = frame.ratio() == null ? "" : frame.ratio().trim();
        Matcher ratioMatch = RATIO_PATTERN.matcher(ratio);
        if (!ratioMatch.matches()) {
            throw invalid("지원하지 않는 이미지 비율입니다.");
        }
        double ratioValue = Double.parseDouble(ratioMatch.group(1)) / Double.parseDouble(ratioMatch.group(2));
        if (ratioValue < MIN_RATIO_VALUE || ratioValue > MAX_RATIO_VALUE) {
            throw invalid("카드 비율은 1:4 에서 4:1 사이여야 합니다.");
        }
        String background = requireHex(frame.backgroundColor(), "#ffffff", false);
        String backgroundTexture = "PAPER".equalsIgnoreCase(frame.backgroundTexture()) ? "PAPER" : "NONE";

        PhotoCardLayout.Padding padding = frame.padding() != null ? frame.padding()
                : new PhotoCardLayout.Padding(0.0, 0.0, 0.0, 0.0);
        PhotoCardLayout.Padding safePadding = new PhotoCardLayout.Padding(
                ratio(padding.top(), 0.0, 0.0, 0.5, "여백"),
                ratio(padding.right(), 0.0, 0.0, 0.5, "여백"),
                ratio(padding.bottom(), 0.0, 0.0, 0.5, "여백"),
                ratio(padding.left(), 0.0, 0.0, 0.5, "여백")
        );

        // 카드 확장 — 늘리지 않았으면 필드를 남기지 않는다(기존 템플릿 JSON 이 그대로 유지된다).
        PhotoCardLayout.Padding safeExtend = null;
        if (frame.extend() != null) {
            PhotoCardLayout.Padding extend = frame.extend();
            PhotoCardLayout.Padding clamped = new PhotoCardLayout.Padding(
                    ratio(extend.top(), 0.0, 0.0, MAX_EXTEND, "카드 크기"),
                    ratio(extend.right(), 0.0, 0.0, MAX_EXTEND, "카드 크기"),
                    ratio(extend.bottom(), 0.0, 0.0, MAX_BOTTOM_EXTEND, "카드 크기"),
                    ratio(extend.left(), 0.0, 0.0, MAX_EXTEND, "카드 크기")
            );
            if (clamped.top() > 0 || clamped.right() > 0 || clamped.bottom() > 0 || clamped.left() > 0) {
                safeExtend = clamped;
            }
        }

        PhotoCardLayout.Photo photo = frame.photo() != null ? frame.photo()
                : new PhotoCardLayout.Photo("COVER", 0.0, 0.5, 0.5, 1.0, 1.0);
        String fit = photo.fit() != null ? photo.fit().toUpperCase(Locale.ROOT) : "COVER";
        if (!PHOTO_FITS.contains(fit)) {
            throw invalid("사진 배치 방식이 올바르지 않습니다.");
        }
        PhotoCardLayout.Photo safePhoto = new PhotoCardLayout.Photo(
                fit,
                ratio(photo.radius(), 0.0, 0.0, 0.5, "사진 모서리"),
                ratio(photo.x(), 0.5, 0.0, 1.0, "사진 위치"),
                ratio(photo.y(), 0.5, 0.0, 1.0, "사진 위치"),
                ratio(photo.w(), 1.0, 0.01, 1.0, "사진 크기"),
                ratio(photo.h(), 1.0, 0.01, 1.0, "사진 크기")
        );
        return new PhotoCardLayout.Frame(
                ratio, background, backgroundTexture,
                ratio(frame.radius(), 0.0, 0.0, 0.5, "카드 모서리"),
                safePadding, safeExtend, safePhoto);
    }

    private PhotoCardLayout.Layer normalizeLayer(PhotoCardLayout.Layer layer) {
        if (layer == null || layer.type() == null) {
            throw invalid("요소 정보가 비어 있습니다.");
        }
        String type = layer.type().toUpperCase(Locale.ROOT);
        if (!LAYER_TYPES.contains(type)) {
            throw invalid("지원하지 않는 요소 유형입니다.");
        }
        String id = (layer.id() == null || layer.id().isBlank())
                ? java.util.UUID.randomUUID().toString()
                : layer.id().trim();
        if (id.length() > 64) {
            throw invalid("요소 식별자가 너무 깁니다.");
        }

        PhotoCardLayout.Position position = layer.position() != null ? layer.position()
                : new PhotoCardLayout.Position(0.5, 0.5);
        PhotoCardLayout.Position safePosition = new PhotoCardLayout.Position(
                ratio(position.x(), 0.5, 0.0, 1.0, "요소 위치"),
                ratio(position.y(), 0.5, 0.0, 1.0, "요소 위치")
        );
        double rotation = layer.rotation() != null ? layer.rotation() : 0.0;
        if (rotation < -180 || rotation > 180) {
            throw invalid("요소 회전 각도는 -180~180 사이여야 합니다.");
        }
        boolean visible = layer.visible() == null || layer.visible();

        return switch (type) {
            case "TEXT" -> normalizeTextLayer(layer, id, safePosition, rotation, visible);
            case "IMAGE" -> normalizeImageLayer(layer, id, safePosition, rotation, visible);
            case "ICON" -> normalizeIconLayer(layer, id, safePosition, rotation, visible);
            case "DIVIDER" -> normalizeDividerLayer(layer, id, safePosition, rotation, visible);
            default -> normalizeBoxLayer(layer, id, safePosition, rotation, visible);
        };
    }

    private PhotoCardLayout.Layer normalizeTextLayer(PhotoCardLayout.Layer layer, String id,
                                                     PhotoCardLayout.Position position,
                                                     double rotation, boolean visible) {
        PhotoCardBinding binding = layer.binding() != null ? layer.binding() : PhotoCardBinding.NONE;
        String text = layer.text() != null ? layer.text() : "";
        if (text.length() > MAX_TEXT_LENGTH) {
            throw invalid("텍스트는 " + MAX_TEXT_LENGTH + "자 이내여야 합니다.");
        }
        String fontKey = layer.fontKey() != null ? layer.fontKey() : "pretendardBold";
        if (!FONT_KEYS.contains(fontKey)) {
            throw invalid("사용할 수 없는 글꼴입니다.");
        }
        boolean outlineEnabled = Boolean.TRUE.equals(layer.outlineEnabled());
        String textAlign = layer.textAlign() == null ? "CENTER" : layer.textAlign().toUpperCase(Locale.ROOT);
        if (!Set.of("LEFT", "CENTER", "RIGHT").contains(textAlign)) {
            textAlign = "CENTER";
        }
        return PhotoCardLayout.Layer.text(
                id, position, rotation, visible,
                binding,
                Boolean.TRUE.equals(layer.overridden()),
                text,
                fontKey,
                ratio(layer.fontSizeRatio(), 0.04, MIN_FONT_SIZE_RATIO, MAX_FONT_SIZE_RATIO, "글자 크기"),
                requireHex(layer.color(), "#ffffff", false),
                outlineEnabled,
                requireHex(layer.outlineColor(), "#000000", false),
                ratio(layer.outlineWidthRatio(), 0.0, 0.0, 0.05, "외곽선 굵기"),
                layer.letterSpacing() != null ? clamp(layer.letterSpacing(), -0.5, 1.0) : null,
                layer.lineHeight() != null ? clamp(layer.lineHeight(), 0.5, 3.0) : null,
                textAlign,
                layer.widthRatio() != null ? clamp(layer.widthRatio(), 0.05, 1.0) : null
        );
    }

    private PhotoCardLayout.Layer normalizeImageLayer(PhotoCardLayout.Layer layer, String id,
                                                      PhotoCardLayout.Position position,
                                                      double rotation, boolean visible) {
        String source = layer.source() != null ? layer.source().toUpperCase(Locale.ROOT) : "UPLOAD";
        if (!IMAGE_SOURCES.contains(source)) {
            throw invalid("이미지 출처가 올바르지 않습니다.");
        }
        String uploadUrl = layer.uploadUrl();
        if ("UPLOAD".equals(source)) {
            if (uploadUrl == null || uploadUrl.isBlank()) {
                throw invalid("업로드한 이미지가 없습니다.");
            }
            // 외부 URL 을 그대로 그리면 SSRF·핫링크 문제가 된다. 우리 저장소 경로만 허용.
            if (!uploadUrl.startsWith("/api/photo-cards/images/")) {
                throw invalid("이미지 경로가 올바르지 않습니다.");
            }
            if (uploadUrl.length() > 500) {
                throw invalid("이미지 경로가 너무 깁니다.");
            }
        } else {
            uploadUrl = null;
        }
        return PhotoCardLayout.Layer.image(
                id, position, rotation, visible,
                source,
                uploadUrl,
                layer.opacity() != null ? clamp(layer.opacity(), 0.0, 1.0) : 1.0,
                ratio(layer.widthRatio(), 0.15, 0.01, 1.0, "이미지 크기")
        );
    }

    private PhotoCardLayout.Layer normalizeIconLayer(PhotoCardLayout.Layer layer, String id,
                                                     PhotoCardLayout.Position position,
                                                     double rotation, boolean visible) {
        String iconKey = layer.iconKey();
        if (iconKey == null || !ICON_KEYS.contains(iconKey)) {
            throw invalid("사용할 수 없는 아이콘입니다.");
        }
        return PhotoCardLayout.Layer.icon(
                id, position, rotation, visible,
                iconKey,
                ratio(layer.widthRatio(), 0.06, 0.005, 0.5, "아이콘 크기"),
                requireHex(layer.fill(), "#111111", true),
                layer.opacity() != null ? clamp(layer.opacity(), 0.0, 1.0) : 1.0
        );
    }

    private PhotoCardLayout.Layer normalizeDividerLayer(PhotoCardLayout.Layer layer, String id,
                                                        PhotoCardLayout.Position position,
                                                        double rotation, boolean visible) {
        return PhotoCardLayout.Layer.divider(
                id, position, rotation, visible,
                ratio(layer.widthRatio(), 0.8, 0.01, 1.0, "구분선 길이"),
                ratio(layer.thicknessRatio(), 0.002, 0.0005, 0.05, "구분선 굵기"),
                requireHex(layer.fill(), "#dddddd", true)
        );
    }

    private PhotoCardLayout.Layer normalizeBoxLayer(PhotoCardLayout.Layer layer, String id,
                                                    PhotoCardLayout.Position position,
                                                    double rotation, boolean visible) {
        return PhotoCardLayout.Layer.box(
                id, position, rotation, visible,
                layer.opacity() != null ? clamp(layer.opacity(), 0.0, 1.0) : 1.0,
                ratio(layer.widthRatio(), 0.5, 0.01, 1.0, "박스 너비"),
                ratio(layer.heightRatio(), 0.2, 0.01, 1.0, "박스 높이"),
                ratio(layer.radius(), 0.0, 0.0, 0.5, "박스 모서리"),
                requireHex(layer.fill(), "#00000080", true),
                layer.strokeColor() != null ? requireHex(layer.strokeColor(), "#000000", true) : null,
                ratio(layer.strokeWidthRatio(), 0.0, 0.0, 0.05, "테두리 굵기")
        );
    }

    private double ratio(Double value, double fallback, double min, double max, String label) {
        if (value == null) return fallback;
        if (value.isNaN() || value.isInfinite() || value < min || value > max) {
            throw invalid(label + " 값이 허용 범위를 벗어났습니다.");
        }
        return value;
    }

    private double clamp(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }

    private String requireHex(String value, String fallback, boolean allowAlpha) {
        if (value == null || value.isBlank()) return fallback;
        Pattern pattern = allowAlpha ? HEX_COLOR_ALPHA : HEX_COLOR;
        if (!pattern.matcher(value).matches()) {
            throw invalid("색상 값이 올바르지 않습니다.");
        }
        return value;
    }

    private CustomException invalid(String message) {
        return new CustomException(ErrorCode.PHOTO_CARD_TEMPLATE_INVALID_LAYOUT, message);
    }

    private PhotoCardTemplateResponse toResponse(PhotoCardTemplate template, Long viewerUserId) {
        return PhotoCardTemplateResponse.of(template, readLayout(template), viewerUserId);
    }

    private PhotoCardLayout readLayout(PhotoCardTemplate template) {
        try {
            return objectMapper.readValue(template.getLayoutJson(), PhotoCardLayout.class);
        } catch (JsonProcessingException e) {
            throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
    }

    /** 커밋 후에만 물리 파일을 지운다(롤백 시 파일만 사라지는 사고 방지). */
    private void deleteFileAfterCommit(String savedFileName, String subPath) {
        if (savedFileName == null || subPath == null) return;
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                fileStorageService.delete(savedFileName, subPath);
            }
        });
    }
}
