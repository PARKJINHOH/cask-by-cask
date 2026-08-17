package com.caskbycask.global.util;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Element;

import java.util.ArrayList;
import java.util.List;

/**
 * 본문 리치텍스트에 삽입된 주류 카드 임베드에서 주류 id 를 읽는다.
 * <p>
 * 에디터가 만드는 임베드는 {@code <a data-spirit-id="133" class="di-spirit-embed">} 형태다.
 * HTML 문자열 안에 있어 SQL 로는 조회할 수 없으므로, 저장 시점에 여기서 뽑아 태그 행으로 옮겨야
 * "이 주류를 언급한 글" 같은 역방향 조회가 인덱스로 해결된다.
 * <p>
 * 입력은 {@link HtmlSanitizer} 를 통과한 본문을 전제로 한다.
 */
public final class SpiritEmbedParser {

    private SpiritEmbedParser() {
    }

    /** 등장 순서를 유지한 중복 없는 주류 id 목록. */
    public static List<Long> parseSpiritIds(String html) {
        if (html == null || html.isBlank()) return List.of();

        List<Long> ids = new ArrayList<>();
        for (Element embed : Jsoup.parse(html).select("a[data-spirit-id]")) {
            try {
                long id = Long.parseLong(embed.attr("data-spirit-id").trim());
                if (id > 0 && !ids.contains(id)) ids.add(id);
            } catch (NumberFormatException ignored) {
                // 손상된 임베드 하나가 글 저장을 막을 이유는 없다.
            }
        }
        return List.copyOf(ids);
    }
}
