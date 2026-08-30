package com.caskbycask.domain.review.client;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Element;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * HTML → 평문 변환은 <b>줄바꿈을 살리는 것</b>이 전부다.
 * <p>
 * 프론트의 규칙 파서는 라벨(`N:`·`총평`)을 줄머리에서만 찾는다. 줄바꿈이 사라지면
 * 링크로 가져온 글이 통째로 "향·맛·피니시를 찾지 못했습니다"로 떨어진다.
 * 실제로 그렇게 터진 적이 있어서 이 단계에 테스트를 둔다.
 */
class ReviewSourceClientTest {

    private static Element body(String html) {
        return Jsoup.parse("<div class='write_div'>" + html + "</div>").selectFirst(".write_div");
    }

    @Test
    @DisplayName("<br> 를 줄바꿈으로 되살린다")
    void keepsLineBreaks() {
        String text = ReviewSourceClient.toPlainText(body(
                "N: 바닐라, 캬라멜<br>- 도수에 비해 부드럽다<br>P: 오크, 시트러스"));

        assertThat(text).isEqualTo("N: 바닐라, 캬라멜\n- 도수에 비해 부드럽다\nP: 오크, 시트러스");
    }

    @Test
    @DisplayName("연달아 오는 <br> 는 빈 줄로 남겨 문단을 살린다")
    void keepsParagraphBreaks() {
        String text = ReviewSourceClient.toPlainText(body(
                "향)<br>나무, 시나몬<br><br>맛)<br>단맛"));

        assertThat(text).isEqualTo("향)\n나무, 시나몬\n\n맛)\n단맛");
    }

    @Test
    @DisplayName("표식 문자열이 본문에 새지 않는다")
    void doesNotLeakMarkers() {
        // 예전 구현은 <br> 자리에 ' CBC_BR ' 를 HTML 로 끼워 넣고 되돌렸는데,
        // 파서가 표식을 손대는 바람에 되돌리기가 실패해 글자로 남았다.
        String text = ReviewSourceClient.toPlainText(body(
                "<div>향)<br>나무<br><br>맛)<br>단맛</div>"));

        assertThat(text).doesNotContain("CBC_BR");
        assertThat(text).doesNotContain("�");
        assertThat(text).doesNotContain(" ");
    }

    @Test
    @DisplayName("블록 태그 사이에도 줄바꿈을 넣는다")
    void breaksBetweenBlocks() {
        String text = ReviewSourceClient.toPlainText(body(
                "<div>N: 바닐라</div><div>P: 오크</div><div>F: 후추</div>"));

        assertThat(text.split("\n")).containsExactly("N: 바닐라", "P: 오크", "F: 후추");
    }

    @Test
    @DisplayName("디시 본문처럼 div 안에 <br> 가 섞여도 라벨이 줄머리에 온다")
    void realWorldShape() {
        String text = ReviewSourceClient.toPlainText(body(
                "<div style=\"clear:both\">로튼스펜서콜링스 글렌엘긴 12Y<br><br>"
                        + "N: 시나몬, 오렌지<br><br>시나몬향이 아주 살짝 느껴진다.<br><br>"
                        + "P : 과일, 캬라멜<br><br>첫 입으로 달달한 과일 시럽<br><br>"
                        + "F : 후추, 민트</div>"));

        assertThat(text.lines().filter(line -> line.startsWith("N:")).count()).isEqualTo(1);
        assertThat(text.lines().filter(line -> line.startsWith("P :")).count()).isEqualTo(1);
        assertThat(text.lines().filter(line -> line.startsWith("F :")).count()).isEqualTo(1);
    }

    @Test
    @DisplayName("script·style 은 본문에 섞지 않는다")
    void dropsScriptAndStyle() {
        String text = ReviewSourceClient.toPlainText(body(
                "향)<script>var a = 1;</script><style>.x{color:red}</style><br>나무"));

        assertThat(text).doesNotContain("var a");
        assertThat(text).doesNotContain("color:red");
        assertThat(text).contains("나무");
    }

    @Test
    @DisplayName("&nbsp; 와 잇단 공백은 하나로 줄인다")
    void normalisesWhitespace() {
        String text = ReviewSourceClient.toPlainText(body("N:&nbsp;&nbsp;바닐라   캬라멜"));

        assertThat(text).isEqualTo("N: 바닐라 캬라멜");
    }

    @Test
    @DisplayName("빈 줄이 셋 이상이면 하나로 줄인다")
    void collapsesBlankRuns() {
        String text = ReviewSourceClient.toPlainText(body("향<br><br><br><br>맛"));

        assertThat(text).isEqualTo("향\n\n맛");
    }
}
