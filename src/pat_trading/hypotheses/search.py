"""
Autonomous Hypothesis Generation & Search Engine
Evolutionary search, safe AST mutations, search space budgeting, and random search baseline.
"""

import random
from typing import List, Dict, Any, Tuple
from pat_trading.market.binance import Candle
from pat_trading.features.engine import FeatureEngine
from pat_trading.hypotheses.dsl import (
    ConditionNode,
    LogicalGroup,
    HypothesisAST,
    Hypothesis,
    SafeDSLEvaluator,
)
from pat_trading.simulation.backtest import BacktestEngine
from pat_trading.config import ESTIMATED_SPACE_SIZE


class HypothesisLab:
    def __init__(self, seed: int = 42):
        self.random = random.Random(seed)
        self.dsl = SafeDSLEvaluator()
        self.backtest_engine = BacktestEngine()
        self.feature_engine = FeatureEngine()

        self.estimated_space_size = ESTIMATED_SPACE_SIZE
        self.generated_count = 0
        self.executed_count = 0
        self.early_rejected_count = 0
        self.independent_validation_count = 0

    def get_initial_curated_hypotheses(self) -> List[Hypothesis]:
        return [
            Hypothesis(
                id="hyp-rsi-amihud-bounce",
                name_ar="ارتداد القوة النسبية مع ضعف السيولة",
                description_ar="دخول عند وصول RSI إلى منطقة ذروة بيع حادة (< 28) مع ضعف السيولة، وخروج عند RSI > 55.",
                ast=HypothesisAST(
                    entry_long=LogicalGroup(
                        operator="AND",
                        children=[
                            ConditionNode(left_feature="rsi_14", operator="<", threshold=28.0),
                            ConditionNode(left_feature="amihud_illiquidity_20", operator=">", threshold=1.0),
                        ],
                    ),
                    exit_long=ConditionNode(left_feature="rsi_14", operator=">", threshold=55.0),
                ),
                generation=0,
                parent_ids=[],
            ),
            Hypothesis(
                id="hyp-donchian-volume-surge",
                name_ar="اختراق قناة دونشيان مع انفجار الحجم",
                description_ar="دخول عند تسجيل اختراق علوي لقناة 20 شمعة (> 0.85) مع ارتفاع Z-Score للحجم > 1.5.",
                ast=HypothesisAST(
                    entry_long=LogicalGroup(
                        operator="AND",
                        children=[
                            ConditionNode(left_feature="donchian_breakout_20", operator=">", threshold=0.85),
                            ConditionNode(left_feature="volume_zscore_20", operator=">", threshold=1.5),
                        ],
                    ),
                    exit_long=ConditionNode(left_feature="macd_hist", operator="<", threshold=0.0),
                ),
                generation=0,
                parent_ids=[],
            ),
            Hypothesis(
                id="hyp-sma-trend-continuation",
                name_ar="استمرار الاتجاه بتوافق SMA 20/50",
                description_ar="دخول عندما يكون SMA20 أكبر من SMA50 ومدرج الماكد موجب.",
                ast=HypothesisAST(
                    entry_long=LogicalGroup(
                        operator="AND",
                        children=[
                            ConditionNode(left_feature="sma_ratio_20_50", operator=">", threshold=1.01),
                            ConditionNode(left_feature="macd_hist", operator=">", threshold=0.02),
                        ],
                    ),
                    exit_long=ConditionNode(left_feature="macd_hist", operator="<", threshold=-0.02),
                ),
                generation=0,
                parent_ids=[],
            ),
        ]

    def fast_screen(
        self,
        hypotheses: List[Hypothesis],
        train_candles: List[Candle],
        features: Dict[str, List[float]],
    ) -> Tuple[List[Hypothesis], int]:
        viable: List[Hypothesis] = []
        scored: List[Tuple[Hypothesis, float]] = []

        for h in hypotheses:
            self.executed_count += 1
            entries, exits = self.dsl.generate_signals(h.ast, features, len(train_candles))
            res = self.backtest_engine.run_backtest(train_candles, entries, exits)
            h.fitness_score = res.sharpe_ratio
            scored.append((h, res.sharpe_ratio))

            if res.trade_count >= 2 and res.max_drawdown < 0.45:
                viable.append(h)
                self.independent_validation_count += 1
            else:
                self.early_rejected_count += 1

        if not viable and scored:
            scored.sort(key=lambda x: x[1], reverse=True)
            viable.append(scored[0][0])
            if len(scored) > 1:
                viable.append(scored[1][0])

        return viable, self.early_rejected_count

    def evolve_population(
        self, parents: List[Hypothesis], target_count: int = 4, generation: int = 1
    ) -> List[Hypothesis]:
        valid_parents = parents if parents else self.get_initial_curated_hypotheses()
        evolved: List[Hypothesis] = []

        while len(evolved) < target_count:
            self.generated_count += 1
            p1 = self.random.choice(valid_parents)
            p2 = self.random.choice(valid_parents)

            coin = self.random.random()
            if coin < 0.5:
                # Crossover
                child_ast = HypothesisAST(
                    entry_long=p1.ast.entry_long,
                    exit_long=p2.ast.exit_long,
                )
                mtype = "crossover_entry_exit"
            else:
                # Threshold Mutation
                child_ast = HypothesisAST(
                    entry_long=self._mutate_thresholds(p1.ast.entry_long),
                    exit_long=p1.ast.exit_long,
                )
                mtype = "threshold_mutation"

            h_id = f"hyp-gen{generation}-{self.random.randint(1000, 9999)}"
            evolved.append(Hypothesis(
                id=h_id,
                name_ar=f"فرضية متطورة الجيل {generation} ({mtype})",
                description_ar=f"مشتقة من السلفين {p1.id} و {p2.id} بطفرة {mtype}.",
                ast=child_ast,
                generation=generation,
                parent_ids=[p1.id, p2.id],
                mutation_type=mtype,
            ))

        return evolved

    def run_random_search_baseline(
        self, candles: List[Candle], features: Dict[str, List[float]], budget: int = 10
    ) -> Dict[str, float]:
        feature_keys = list(features.keys())
        sharpes = []

        for _ in range(budget):
            f1 = self.random.choice(feature_keys)
            f2 = self.random.choice(feature_keys)
            op = ">" if self.random.random() > 0.5 else "<"
            random_ast = HypothesisAST(
                entry_long=ConditionNode(left_feature=f1, operator=op, threshold=0.0),
                exit_long=ConditionNode(left_feature=f2, operator="<" if op == ">" else ">", threshold=0.0),
            )
            entries, exits = self.dsl.generate_signals(random_ast, features, len(candles))
            res = self.backtest_engine.run_backtest(candles, entries, exits)
            sharpes.append(res.sharpe_ratio)

        sharpes.sort()
        med = sharpes[len(sharpes) // 2] if sharpes else 0.0
        p95 = sharpes[int(len(sharpes) * 0.95)] if sharpes else 0.0

        return {"median_sharpe": med, "p95_sharpe": p95}

    def _mutate_thresholds(self, node: Any) -> Any:
        if isinstance(node, ConditionNode):
            delta = 1.0 + (self.random.random() - 0.5) * 0.2
            return ConditionNode(
                left_feature=node.left_feature,
                operator=node.operator,
                threshold=round(node.threshold * delta, 4),
                threshold2=node.threshold2,
            )
        elif isinstance(node, LogicalGroup):
            return LogicalGroup(
                operator=node.operator,
                children=[self._mutate_thresholds(c) for c in node.children],
            )
        return node
