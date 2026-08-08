import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock

from wine_ingest.providers import FixtureWineProvider, VivinoBlockedError, VivinoWebCrawlerProvider
from wine_ingest.vivino_web import DEFAULT_USER_AGENT, _decode_html, _number, _parse_volume


class WineIngestProviderTest(unittest.TestCase):
    def test_offline_fixture_contains_three_english_only_items(self):
        fixture = Path(__file__).parents[1] / "fixtures" / "wine_license_review.json"
        items = FixtureWineProvider(str(fixture)).collect(10)
        self.assertEqual(3, len(items))
        self.assertTrue(all(item.get("nameEn") for item in items))
        self.assertTrue(all("nameKo" not in item for item in items))

    def test_fixture_never_returns_more_than_three(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "fixture.json"
            path.write_text(json.dumps([{"id": i} for i in range(8)]), encoding="utf-8")
            items = FixtureWineProvider(str(path)).collect(10)
            self.assertEqual(3, len(items))

    def test_web_crawler_rejects_non_vivino_start_url(self):
        with self.assertRaises(ValueError):
            VivinoWebCrawlerProvider(
                start_urls=["https://example.com/w/1"],
            )

    def test_blank_user_agent_falls_back_to_the_default(self):
        self.assertEqual(DEFAULT_USER_AGENT, VivinoWebCrawlerProvider(fetcher=lambda _url: "").user_agent)
        custom = "WineBot/1.0 (contact: ops@example.com)"
        self.assertEqual(custom, VivinoWebCrawlerProvider(user_agent=custom, fetcher=lambda _url: "").user_agent)

    def test_web_crawler_parses_structured_page_and_maps_taste_levels(self):
        detail_url = "https://www.vivino.com/US/en/example-wine/w/123?year=2020"
        pages = {
            "https://www.vivino.com/explore": f'<a href="{detail_url}">wine</a>',
            detail_url: self.detail_html(detail_url),
        }
        provider = self.provider(pages)

        items = provider.collect(1)

        self.assertEqual(1, len(items))
        item = items[0]
        self.assertEqual("123", item["externalWineId"])
        self.assertEqual("9001", item["externalVintageId"])
        self.assertEqual("Example Cabernet Sauvignon", item["nameEn"])
        self.assertEqual("Example Winery", item["producerNameEn"])
        self.assertEqual(2020, item["vintageYear"])
        self.assertEqual(13.5, item["abv"])
        self.assertEqual(750, item["volumeMl"])
        self.assertEqual("RED", item["wineDetail"]["wineType"])
        self.assertEqual("OFF_DRY", item["wineDetail"]["sweetness"])
        self.assertEqual("MEDIUM_FULL", item["wineDetail"]["body"])
        self.assertEqual("HIGH", item["wineDetail"]["acidity"])
        self.assertEqual("MEDIUM_HIGH", item["wineDetail"]["tannin"])
        self.assertNotIn("nameKo", item)

    def test_web_crawler_caps_random_detail_fetches_to_ten(self):
        discovery_url = "https://www.vivino.com/explore"
        detail_urls = [f"https://www.vivino.com/US/en/wine-{i}/w/{100 + i}?year=2020" for i in range(20)]
        pages = {discovery_url: "".join(f'<a href="{url}">wine</a>' for url in detail_urls)}
        pages.update({url: self.detail_html(url, wine_id=str(100 + i), vintage_id=str(9000 + i)) for i, url in enumerate(detail_urls)})
        calls = []

        provider = self.provider(pages, calls)
        items = provider.collect(99)

        self.assertEqual(10, len(items))
        self.assertEqual(11, len(calls))  # discovery 1 + detail 10

    def test_web_crawler_discovers_candidates_from_public_pagination(self):
        first = "https://www.vivino.com/explore"
        second = "https://www.vivino.com/explore?page=2"
        first_detail = "https://www.vivino.com/US/en/first/w/123?year=2020"
        second_detail = "https://www.vivino.com/US/en/second/w/124?year=2020"
        pages = {
            first: f'<a href="{first_detail}">first</a><a rel="next" href="/explore?page=2">next</a>',
            second: f'<a href="{second_detail}">second</a>',
            first_detail: self.detail_html(first_detail, wine_id="123", vintage_id="9001"),
            second_detail: self.detail_html(second_detail, wine_id="124", vintage_id="9002"),
        }
        calls = []

        items = self.provider(pages, calls).collect(2)

        self.assertEqual(2, len(items))
        self.assertIn(second, calls)

    def test_web_crawler_returns_parse_failure_for_missing_required_field(self):
        detail_url = "https://www.vivino.com/US/en/example-wine/w/123?year=2020"
        detail = json.loads(self.detail_payload())
        detail["props"]["pageProps"]["vintage"]["wine"]["region"].pop("country")
        pages = {
            "https://www.vivino.com/explore": f'<a href="{detail_url}">wine</a>',
            detail_url: f'<script id="__NEXT_DATA__" type="application/json">{json.dumps(detail)}</script>',
        }

        item = self.provider(pages).collect(1)[0]

        self.assertEqual("REQUIRED_FIELD_MISSING", item["_providerErrorCode"])
        self.assertIn("country", item["_providerError"])
        self.assertEqual(detail_url, item["sourceUrl"])

    def test_missing_winery_still_produces_a_collectable_wine(self):
        detail_url = "https://www.vivino.com/US/en/example-wine/w/123?year=2020"
        detail = json.loads(self.detail_payload())
        detail["props"]["pageProps"]["vintage"]["wine"].pop("winery")
        pages = {
            "https://www.vivino.com/explore": f'<a href="{detail_url}">wine</a>',
            detail_url: (
                f'<link rel="canonical" href="{detail_url}">'
                f'<script id="__NEXT_DATA__" type="application/json">{json.dumps(detail)}</script>'
            ),
        }

        item = self.provider(pages).collect(1)[0]

        self.assertNotIn("_providerErrorCode", item)
        self.assertIsNone(item["producerNameEn"])
        self.assertEqual("Example Cabernet Sauvignon", item["nameEn"])
        self.assertEqual("United States", item["country"])

    def test_bot_challenge_stops_the_run_without_touching_remaining_candidates(self):
        discovery_url = "https://www.vivino.com/explore"
        detail_urls = [f"https://www.vivino.com/US/en/wine-{i}/w/{100 + i}?year=2020" for i in range(3)]
        pages = {discovery_url: "".join(f'<a href="{url}">wine</a>' for url in detail_urls)}
        pages[detail_urls[0]] = "<html><body>Please verify you are human</body></html>"
        pages.update({url: self.detail_html(url) for url in detail_urls[1:]})
        calls = []

        items = self.provider(pages, calls).collect(3)

        self.assertEqual(3, len(items))
        self.assertTrue(all(item["_providerErrorCode"] == "VIVINO_ACCESS_BLOCKED" for item in items))
        self.assertEqual([discovery_url, detail_urls[0]], calls)

    def test_failed_discovery_pages_consume_the_page_budget(self):
        first = "https://www.vivino.com/explore"
        pages = {first: "".join(
            f'<a rel="next" href="/explore?page={index}">next</a>' for index in range(2, 12)
        )}
        calls = []

        with self.assertRaises(RuntimeError):
            self.provider(pages, calls).collect(1)

        self.assertEqual(3, len(calls))  # discovery_page_limit 기본값

    def test_progress_callback_reports_each_completed_candidate(self):
        detail_url = "https://www.vivino.com/US/en/example-wine/w/123?year=2020"
        pages = {
            "https://www.vivino.com/explore": f'<a href="{detail_url}">wine</a>',
            detail_url: self.detail_html(detail_url),
        }
        progress = Mock()

        self.provider(pages, on_progress=progress).collect(1)

        progress.assert_called_once_with()

    def test_european_decimal_comma_is_not_read_as_thousands(self):
        self.assertEqual(13.5, _number("13,5%"))
        self.assertEqual(1200.0, _number("1,200"))
        self.assertEqual(1234567.0, _number("1.234.567"))
        self.assertEqual(1234.5, _number("1.234,5"))

    def test_volume_needs_bottle_context_and_honours_decimal_comma(self):
        self.assertIsNone(_parse_volume({}, {}, "Aged 18 months, 12 l of oak char discussion"))
        self.assertEqual(750, _parse_volume({}, {}, "Bottle size 750 ml"))
        self.assertEqual(1500, _parse_volume({}, {}, "Bottle volume 1,5 l"))
        self.assertEqual(750, _parse_volume({"bottle_volume_ml": 750}, {}, ""))

    def test_html_without_header_charset_is_decoded_as_utf8(self):
        body = "<html><body>Château Margaux</body></html>".encode("utf-8")
        self.assertIn("Château Margaux", _decode_html(body, "text/html"))
        self.assertIn("Château Margaux", _decode_html(body, "text/html; charset=utf-8"))

    def test_listing_paths_are_not_mistaken_for_wine_detail_pages(self):
        listing = "https://www.vivino.com/wines/red"
        detail = "https://www.vivino.com/US/en/example-wine/w/123?year=2020"
        pages = {
            "https://www.vivino.com/explore": f'<a href="{listing}">list</a><a href="{detail}">wine</a>',
            detail: self.detail_html(detail),
        }
        calls = []

        items = self.provider(pages, calls).collect(5)

        self.assertEqual(1, len(items))
        self.assertNotIn(listing, calls)

    def provider(self, pages, calls=None, on_progress=None):
        def fetch(url):
            if calls is not None:
                calls.append(url)
            return pages[url]

        rng = Mock()
        rng.shuffle.side_effect = lambda values: None
        return VivinoWebCrawlerProvider(
            start_urls=["https://www.vivino.com/explore"],
            fetcher=fetch,
            sleeper=lambda _seconds: None,
            rng=rng,
            on_progress=on_progress,
        )

    @classmethod
    def detail_html(cls, source_url, wine_id="123", vintage_id="9001"):
        payload = json.loads(cls.detail_payload(wine_id, vintage_id))
        return (
            f'<link rel="canonical" href="{source_url}">'
            f'<script id="__NEXT_DATA__" type="application/json">{json.dumps(payload)}</script>'
        )

    @staticmethod
    def detail_payload(wine_id="123", vintage_id="9001"):
        return json.dumps({
            "props": {"pageProps": {"vintage": {
                "id": vintage_id,
                "year": 2020,
                "alcohol": 13.5,
                "bottle_volume_ml": 750,
                "wine": {
                    "id": wine_id,
                    "name": "Example Cabernet Sauvignon",
                    "type": "Red Wine",
                    "winery": {"name": "Example Winery"},
                    "region": {"name": "Napa Valley", "country": {"name": "United States"}},
                    "grapes": [{"name": "Cabernet Sauvignon", "percentage": 100}],
                },
                "statistics": {"ratings_average": 4.3, "ratings_count": 1200},
                "image": {"location": "https://images.vivino.com/example.png"},
                "taste": {"structure": {
                    "sweetness": 2.1, "intensity": 4.2, "acidity": 4.6, "tannin": 3.7,
                }},
            }}}
        })


if __name__ == "__main__":
    unittest.main()
