import unittest

from filters.volume_normalizer import extract_volume_ml, normalize_volume_ml


class VolumeNormalizerTest(unittest.TestCase):
    def test_common_units_are_normalized_to_ml(self) -> None:
        cases = {
            "글렌피딕 12년 700ml": 700,
            "Glenfiddich 12 70 cl": 700,
            "Bottle size 0.7L": 700,
            "1,000㎖": 1000,
            "1.75ℓ": 1750,
            "용량 500미리": 500,
            "700cc": 700,
        }
        for text, expected in cases.items():
            with self.subTest(text=text):
                self.assertEqual(expected, extract_volume_ml(text))

    def test_pack_count_does_not_change_per_bottle_volume(self) -> None:
        self.assertEqual(700, extract_volume_ml("700ml x 2병 세트"))

    def test_ambiguous_or_range_volume_is_unknown(self) -> None:
        self.assertIsNone(extract_volume_ml("500ml / 700ml 중 선택"))
        self.assertIsNone(extract_volume_ml("500~700ml 랜덤 발송"))
        self.assertIsNone(extract_volume_ml("도수 40%, 12년"))

    def test_structured_model_values_are_validated(self) -> None:
        self.assertEqual(700, normalize_volume_ml(700))
        self.assertEqual(700, normalize_volume_ml("70cl"))
        self.assertIsNone(normalize_volume_ml(0.7))
        self.assertIsNone(normalize_volume_ml(0))
        self.assertIsNone(normalize_volume_ml(100001))


if __name__ == "__main__":
    unittest.main()
