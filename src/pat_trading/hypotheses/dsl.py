"""
Safe Hypothesis AST DSL Evaluator
Strictly no eval() or dynamic code execution.
"""

from dataclasses import dataclass
from typing import List, Dict, Any, Optional, Tuple


@dataclass
class ConditionNode:
    left_feature: str
    operator: str  # '>', '<', '>=', '<=', 'CROSSES_ABOVE', 'CROSSES_BELOW', 'BETWEEN'
    threshold: float
    threshold2: Optional[float] = None


@dataclass
class LogicalGroup:
    operator: str  # 'AND', 'OR'
    children: List[Any]


@dataclass
class HypothesisAST:
    entry_long: Any
    exit_long: Any


@dataclass
class Hypothesis:
    id: str
    name_ar: str
    description_ar: str
    ast: HypothesisAST
    generation: int
    parent_ids: List[str]
    mutation_type: Optional[str] = None
    fitness_score: Optional[float] = None


class SafeDSLEvaluator:
    def evaluate_condition(
        self, cond: ConditionNode, features: Dict[str, List[float]], idx: int
    ) -> bool:
        series = features.get(cond.left_feature)
        if not series or idx >= len(series):
            return False

        val = series[idx]
        if math_is_nan(val):
            return False

        th = cond.threshold

        if cond.operator == '>':
            return val > th
        elif cond.operator == '<':
            return val < th
        elif cond.operator == '>=':
            return val >= th
        elif cond.operator == '<=':
            return val <= th
        elif cond.operator == 'BETWEEN':
            if cond.threshold2 is None:
                return False
            low = min(th, cond.threshold2)
            high = max(th, cond.threshold2)
            return low <= val <= high
        elif cond.operator == 'CROSSES_ABOVE':
            if idx < 1:
                return False
            prev_val = series[idx - 1]
            return not math_is_nan(prev_val) and prev_val <= th and val > th
        elif cond.operator == 'CROSSES_BELOW':
            if idx < 1:
                return False
            prev_val = series[idx - 1]
            return not math_is_nan(prev_val) and prev_val >= th and val < th
        return False

    def evaluate_node(self, node: Any, features: Dict[str, List[float]], idx: int) -> bool:
        if isinstance(node, ConditionNode):
            return self.evaluate_condition(node, features, idx)
        elif isinstance(node, LogicalGroup):
            if not node.children:
                return False
            if node.operator == 'AND':
                return all(self.evaluate_node(c, features, idx) for c in node.children)
            else:
                return any(self.evaluate_node(c, features, idx) for c in node.children)
        return False

    def generate_signals(
        self, ast: HypothesisAST, features: Dict[str, List[float]], length: int
    ) -> Tuple[List[bool], List[bool]]:
        entry_signals = [self.evaluate_node(ast.entry_long, features, i) for i in range(length)]
        exit_signals = [self.evaluate_node(ast.exit_long, features, i) for i in range(length)]
        return entry_signals, exit_signals


def math_is_nan(x: float) -> bool:
    return x != x
