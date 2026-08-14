package com.caskbycask.global.storage;

import java.util.List;

/**
 * 해상도 상한과 반응형 변형본 폭을 함께 지정한다.
 * <p>
 * 이미지 갤러리처럼 <b>원본은 크지만 목록에서는 작게 쓰이는</b> 도메인용이다.
 * 목록 타일 폭에 원본 해상도를 그대로 내려보내면 화면에 보이는 것보다 수십 배 큰 바이트를 받게 된다.
 *
 * @param maxEdge       본 이미지 장변 상한(px). 원본이 이보다 작으면 그대로 둔다.
 * @param variantWidths 함께 만들 축소본 폭 목록. 파일명은 {@code {base}_w{폭}.webp} 규칙을 따른다.
 *                      원본보다 넓은 폭은 생성되지 않는다.
 */
public record ResponsiveImageSpec(int maxEdge, List<Integer> variantWidths) {

    public ResponsiveImageSpec {
        variantWidths = variantWidths == null ? List.of() : List.copyOf(variantWidths);
    }

    /** {@code {uuid}.webp} → {@code {uuid}_w640.webp} */
    public static String variantFileName(String baseFileName, int width) {
        int dot = baseFileName.lastIndexOf('.');
        String base = dot < 0 ? baseFileName : baseFileName.substring(0, dot);
        return base + "_w" + width + ".webp";
    }
}
