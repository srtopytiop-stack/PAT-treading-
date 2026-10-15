"""
Integration Test Suite: BinanceService to HypothesisLab Pipeline
Verifies end-to-end data flow:
Mock Market Data -> Normalization & Audit -> Causal Features -> Hypothesis Lab Screening & Evolution.
Uses strict mock data to guarantee zero network calls.
"""

import pytest
from pat_trading.config import TRADING_ENABLED, LIVE_TRADING_ENABLED, ESTIMATED_SPACE_SIZE
from pat_trading.market.binance import BinanceService
from pat_trading.features.engine import FeatureEngine
from pat_trading.hypotheses.search import HypothesisLab


class TestSecurityGuardrails:
    def test_trading_flags_permanently_disabled(self):
        """Non-negotiable security constraint: real trading must remain strictly False."""
        assert TRADING_ENABLED is False, "TRADING_ENABLED must be False"
        assert LIVE_TRADING_ENABLED is False, "LIVE_TRADING_ENABLED must be False"


class TestBinanceDataFlow:
    def test_universe_discovery_with_mock_data(self, mock_binance_service):
        """Verifies universe discovery filters only active Spot USDT pairs."""
        universe = mock_binance_service.get_exchange_universe(quote_asset="USDT")
        assert len(universe) == 3
        symbols = [u["symbol"] for u in universe]
        assert "BTCUSDT" in symbols
        assert "ETHUSDT" in symbols
        assert "SOLUSDT" in symbols
        assert "INACTIVEUSDT" not in symbols

    def test_klines_normalization_and_integrity_check(self, mock_binance_service):
        """Verifies normalization, UTC formatting, and clean integrity audit."""
        candles, report = mock_binance_service.get_klines("BTCUSDT", "1h", limit=150)

        assert len(candles) == 150
        assert report.is_clean is True
        assert report.missing_candles_count == 0
        assert report.duplicate_count == 0
        assert report.non_monotonic_count == 0

        # Verify monotonicity of UTC timestamps
        for i in range(1, len(candles)):
            assert candles[i].open_time > candles[i - 1].open_time

    def test_detects_data_gaps_and_duplicates_without_silent_clipping(
        self, monkeypatch, mock_klines_with_integrity_issues
    ):
        """Ensures corrupted feeds trigger explicit warnings and gap records."""
        service = BinanceService()
        monkeypatch.setattr(service, "_fetch_json", lambda url: mock_klines_with_integrity_issues)

        candles, report = service.get_klines("BTCUSDT", "1h")

        assert report.is_clean is False
        assert report.duplicate_count == 1
        assert report.missing_candles_count >= 1
        assert len(report.gap_ranges) >= 1
        assert len(report.warnings) >= 1


class TestFeatureEngineIntegration:
    def test_causal_feature_extraction_from_candles(self, mock_binance_service):
        """Verifies feature computation on normalized candles."""
        candles, _ = mock_binance_service.get_klines("BTCUSDT", "1h")
        engine = FeatureEngine()
        features = engine.compute_features(candles)

        assert "rsi_14" in features
        assert "macd_hist" in features
        assert "garman_klass_vol" in features
        assert "amihud_illiquidity_20" in features
        assert "volume_zscore_20" in features

        # After warmup (index >= 50), values must be valid numbers
        for idx in range(50, len(candles)):
            assert not (features["rsi_14"][idx] != features["rsi_14"][idx])
            assert not (features["macd_hist"][idx] != features["macd_hist"][idx])
            assert not (features["garman_klass_vol"][idx] != features["garman_klass_vol"][idx])

    def test_strict_point_in_time_causality_no_lookahead(self, mock_binance_service):
        """
        Critical mathematical test:
        Feature value at index K must be identical whether computed on prefix [0..K] or full [0..N].
        """
        candles, _ = mock_binance_service.get_klines("BTCUSDT", "1h")
        engine = FeatureEngine()

        full_features = engine.compute_features(candles)
        prefix_candles = candles[:81]
        prefix_features = engine.compute_features(prefix_candles)

        target_idx = 80
        assert round(full_features["rsi_14"][target_idx], 5) == round(
            prefix_features["rsi_14"][target_idx], 5
        )
        assert round(full_features["macd_hist"][target_idx], 5) == round(
            prefix_features["macd_hist"][target_idx], 5
        )
        assert round(full_features["garman_klass_vol"][target_idx], 5) == round(
            prefix_features["garman_klass_vol"][target_idx], 5
        )


class TestHypothesisLabIntegration:
    def test_fast_screening_and_evolution_pipeline(self, mock_binance_service):
        """Verifies data flow through HypothesisLab screening and genetic evolution."""
        candles, _ = mock_binance_service.get_klines("BTCUSDT", "1h")
        engine = FeatureEngine()
        lab = HypothesisLab(seed=123)

        train_split = candles[: len(candles) // 2]
        train_features = engine.compute_features(train_split)

        initial_hypotheses = lab.get_initial_curated_hypotheses()
        assert len(initial_hypotheses) >= 3

        viable, rejected_count = lab.fast_screen(initial_hypotheses, train_split, train_features)
        assert len(viable) >= 1
        assert lab.executed_count >= 3

        # Evolve new generation from viable parents
        evolved = lab.evolve_population(viable, target_count=4, generation=1)
        assert len(evolved) == 4
        for child in evolved:
            assert child.generation == 1
            assert len(child.parent_ids) == 2
            assert child.ast is not None

    def test_search_space_budget_and_random_search_comparison(self, mock_binance_service):
        """Verifies space size estimation and comparison against random baseline."""
        candles, _ = mock_binance_service.get_klines("BTCUSDT", "1h")
        engine = FeatureEngine()
        features = engine.compute_features(candles)
        lab = HypothesisLab(seed=456)

        assert lab.estimated_space_size == ESTIMATED_SPACE_SIZE

        baseline = lab.run_random_search_baseline(candles, features, budget=8)
        assert "median_sharpe" in baseline
        assert "p95_sharpe" in baseline


class TestEndToEndPipeline:
    def test_complete_binance_to_hypothesislab_execution(self, mock_binance_service):
        """
        Complete end-to-end integration test:
        1. BinanceService fetches and normalizes mock klines with audit.
        2. FeatureEngine extracts point-in-time quantitative features.
        3. HypothesisLab loads curated hypotheses, screens on train split, and evolves novel candidates.
        """
        # Step 1: Ingest and Validate
        candles, report = mock_binance_service.get_klines("BTCUSDT", "1h", limit=120)
        assert report.is_clean is True

        # Step 2: Causal Feature Engineering
        engine = FeatureEngine()
        features = engine.compute_features(candles)
        assert len(features["returns_1"]) == len(candles)

        # Step 3: Hypothesis Lab Screening
        train_end = int(len(candles) * 0.5)
        train_candles = candles[:train_end]
        train_features = engine.compute_features(train_candles)

        lab = HypothesisLab(seed=999)
        population = lab.get_initial_curated_hypotheses()
        viable, _ = lab.fast_screen(population, train_candles, train_features)
        assert len(viable) > 0

        # Step 4: Evolution & Signal Generation
        children = lab.evolve_population(viable, target_count=3, generation=1)
        best_candidate = viable[0]
        entries, exits = lab.dsl.generate_signals(best_candidate.ast, features, len(candles))

        assert len(entries) == len(candles)
        assert len(exits) == len(candles)

        # Step 5: Simulation Execution
        bt_res = lab.backtest_engine.run_backtest(candles, entries, exits)
        assert bt_res.total_candles == len(candles)
        assert isinstance(bt_res.sharpe_ratio, float)
        assert isinstance(bt_res.total_return, float)
