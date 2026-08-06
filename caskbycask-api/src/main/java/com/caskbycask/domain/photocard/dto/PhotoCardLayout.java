package com.caskbycask.domain.photocard.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

/**
 * 포토카드 레이아웃 스키마.
 * <p>
 * <b>좌표·크기·글자 크기를 전부 비율(0~1)로 담는다.</b> 프레임 짧은 변을 1 로 본 값이라
 * 원본 사진이 3000px 이든 1080px 이든 같은 템플릿이 똑같이 보인다.
 * 렌더 시점에 {@code px = ratio * min(canvas.width, canvas.height)} 로 환산한다.
 * <p>
 * 레이어는 타입별로 클래스를 나누지 않고 하나의 record 에 담는다 — Jackson 다형성 설정 없이
 * 그대로 왕복시키기 위해서다. 타입에 해당하지 않는 필드는 null 이고 직렬화에서 빠진다.
 * <p>
 * 프론트 {@code src/domain/photo-card/types/photoCard.types.ts} 와 1:1 로 유지해야 한다.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties(ignoreUnknown = true)
public record PhotoCardLayout(
        Integer schemaVersion,
        Frame frame,
        List<Layer> layers
) {

    @JsonInclude(JsonInclude.Include.NON_NULL)
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Frame(
            /** "1:1" | "4:5" | "3:4" | "9:16" | "16:9" */
            String ratio,
            /** #rrggbb */
            String backgroundColor,
            /** 카드 전체 모서리 둥글기 — 짧은 변 대비 비율 */
            Double radius,
            Padding padding,
            Photo photo
    ) {}

    /** 프레임 안쪽 여백 — 사진 아래 정보 밴드를 만드는 수단이다(보통 bottom 을 크게 준다). */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Padding(Double top, Double right, Double bottom, Double left) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Photo(
            /** COVER(잘라서 채움) | CONTAIN(다 보이게) */
            String fit,
            Double radius,
            /** 사진 영역 중심과 크기 — 프레임 대비 비율 */
            Double x, Double y, Double w, Double h
    ) {}

    /** 프레임 대비 정규화 좌표(0~1). 요소의 중심을 가리킨다. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Position(Double x, Double y) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Layer(
            String id,
            /** TEXT | IMAGE | DIVIDER | BOX | ICON */
            String type,
            Position position,
            Double rotation,
            Boolean visible,

            // ── TEXT ────────────────────────────
            PhotoCardBinding binding,
            /** 자동으로 채워진 값을 사용자가 고쳤는가 — true 면 text 를 그대로 쓴다 */
            Boolean overridden,
            String text,
            String fontKey,
            Double fontSizeRatio,
            String color,
            Boolean outlineEnabled,
            String outlineColor,
            Double outlineWidthRatio,
            Double letterSpacing,
            Double lineHeight,

            // ── ICON ────────────────────────────
            /** 프론트 photoCardIcons.ts 의 key */
            String iconKey,

            // ── IMAGE ───────────────────────────
            /** PRODUCER_LOGO | SPIRIT_IMAGE | UPLOAD */
            String source,
            String uploadUrl,
            Double opacity,

            // ── IMAGE / DIVIDER / BOX ───────────
            Double widthRatio,
            Double heightRatio,
            Double thicknessRatio,
            Double radius,
            String fill,
            String strokeColor,
            Double strokeWidthRatio
    ) {
        /**
         * 타입별 정적 팩토리.
         * <p>
         * 필드가 27개라 위치 인자로 직접 생성하면 필드를 하나만 끼워 넣어도 그 뒤가 전부 밀린다
         * (컴파일은 통과하고 값만 조용히 어긋난다). 생성은 아래 팩토리로만 한다.
         */
        public static Layer text(String id, Position position, double rotation, boolean visible,
                                 PhotoCardBinding binding, boolean overridden, String text,
                                 String fontKey, double fontSizeRatio, String color,
                                 boolean outlineEnabled, String outlineColor, double outlineWidthRatio,
                                 Double letterSpacing, Double lineHeight) {
            return new Layer(id, "TEXT", position, rotation, visible,
                    binding, overridden, text, fontKey, fontSizeRatio, color,
                    outlineEnabled, outlineColor, outlineWidthRatio, letterSpacing, lineHeight,
                    null,
                    null, null, null,
                    null, null, null, null, null, null, null);
        }

        public static Layer icon(String id, Position position, double rotation, boolean visible,
                                 String iconKey, double widthRatio, String fill, double opacity) {
            return new Layer(id, "ICON", position, rotation, visible,
                    null, null, null, null, null, null, null, null, null, null, null,
                    iconKey,
                    null, null, opacity,
                    widthRatio, null, null, null, fill, null, null);
        }

        public static Layer image(String id, Position position, double rotation, boolean visible,
                                  String source, String uploadUrl, double opacity, double widthRatio) {
            return new Layer(id, "IMAGE", position, rotation, visible,
                    null, null, null, null, null, null, null, null, null, null, null,
                    null,
                    source, uploadUrl, opacity,
                    widthRatio, null, null, null, null, null, null);
        }

        public static Layer divider(String id, Position position, double rotation, boolean visible,
                                    double widthRatio, double thicknessRatio, String fill) {
            return new Layer(id, "DIVIDER", position, rotation, visible,
                    null, null, null, null, null, null, null, null, null, null, null,
                    null,
                    null, null, null,
                    widthRatio, null, thicknessRatio, null, fill, null, null);
        }

        public static Layer box(String id, Position position, double rotation, boolean visible,
                                double opacity, double widthRatio, double heightRatio, double radius,
                                String fill, String strokeColor, double strokeWidthRatio) {
            return new Layer(id, "BOX", position, rotation, visible,
                    null, null, null, null, null, null, null, null, null, null, null,
                    null,
                    null, null, opacity,
                    widthRatio, heightRatio, null, radius, fill, strokeColor, strokeWidthRatio);
        }
    }
}
