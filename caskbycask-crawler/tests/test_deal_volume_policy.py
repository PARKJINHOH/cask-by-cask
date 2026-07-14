import unittest

from filters.deal_policy import review_analysis
from models import AnalysisResult, PostDetail, RawPost


class DealVolumePolicyTest(unittest.TestCase):
    def test_multi_bottle_total_price_is_not_accepted_as_single_bottle_price(self) -> None:
        detail = self._detail("글렌피딕 12년 700ml x 2 세트 할인")
        decision = review_analysis(detail, self._analysis(700))

        self.assertFalse(decision.accepted)
        self.assertEqual("complex_discount", decision.reason)

    def test_ambiguous_source_sizes_remain_unknown(self) -> None:
        detail = self._detail("글렌피딕 12년 500ml / 700ml 선택 특가")
        decision = review_analysis(detail, self._analysis(None))

        self.assertTrue(decision.accepted)
        self.assertIsNone(decision.result.volume_ml)

    @staticmethod
    def _detail(title: str) -> PostDetail:
        return PostDetail(
            raw=RawPost(
                site="dcinside",
                board_id="test",
                board_name="test",
                post_id="1",
                title=title,
                url="https://example.com/1",
            ),
            content_text="정상가 100000원 할인가 80000원",
        )

    @staticmethod
    def _analysis(volume_ml: int | None) -> AnalysisResult:
        return AnalysisResult(
            is_deal=True,
            drink_name="글렌피딕 12년",
            drink_category="WHISKY",
            volume_ml=volume_ml,
            original_price=100_000,
            deal_price=80_000,
            discount_rate=0.2,
            currency="KRW",
            seller="테스트 매장",
            deal_condition=None,
            expiry_info=None,
            confidence_score=9,
            summary_ko="단품 할인",
        )


if __name__ == "__main__":
    unittest.main()
