/**
 * Safe Hypothesis DSL Evaluator & Formatter
 * Strict security: Zero eval(), zero Function(), safe typed AST traversal only.
 */

import { ASTCondition, ASTLogicalGroup, ASTNode, Hypothesis, HypothesisAST } from '../types/quant';

export class SafeDSLEvaluator {
  /**
   * Evaluates an AST condition node for a specific time index
   */
  evaluateCondition(
    cond: ASTCondition,
    features: Record<string, number[]>,
    index: number
  ): boolean {
    const leftVals = features[cond.leftFeature];
    if (!leftVals || index >= leftVals.length) return false;

    const leftVal = leftVals[index];
    if (isNaN(leftVal)) return false;

    let rightVal = cond.threshold ?? 0;
    if (cond.rightFeature) {
      const rightVals = features[cond.rightFeature];
      if (!rightVals || isNaN(rightVals[index])) return false;
      rightVal = rightVals[index];
    }

    switch (cond.operator) {
      case '>':
        return leftVal > rightVal;
      case '<':
        return leftVal < rightVal;
      case '>=':
        return leftVal >= rightVal;
      case '<=':
        return leftVal <= rightVal;
      case 'BETWEEN':
        if (cond.threshold2 === undefined) return false;
        const low = Math.min(rightVal, cond.threshold2);
        const high = Math.max(rightVal, cond.threshold2);
        return leftVal >= low && leftVal <= high;
      case 'CROSSES_ABOVE': {
        if (index < 1) return false;
        const prevLeft = leftVals[index - 1];
        let prevRight = cond.threshold ?? 0;
        if (cond.rightFeature && features[cond.rightFeature]) {
          prevRight = features[cond.rightFeature][index - 1];
        }
        if (isNaN(prevLeft) || isNaN(prevRight)) return false;
        return prevLeft <= prevRight && leftVal > rightVal;
      }
      case 'CROSSES_BELOW': {
        if (index < 1) return false;
        const prevLeft = leftVals[index - 1];
        let prevRight = cond.threshold ?? 0;
        if (cond.rightFeature && features[cond.rightFeature]) {
          prevRight = features[cond.rightFeature][index - 1];
        }
        if (isNaN(prevLeft) || isNaN(prevRight)) return false;
        return prevLeft >= prevRight && leftVal < rightVal;
      }
      default:
        return false;
    }
  }

  /**
   * Recursively evaluates any AST node
   */
  evaluateNode(
    node: ASTNode,
    features: Record<string, number[]>,
    index: number
  ): boolean {
    if (node.type === 'condition') {
      return this.evaluateCondition(node, features, index);
    }

    if (node.type === 'group') {
      if (!node.children || node.children.length === 0) return false;
      if (node.operator === 'AND') {
        return node.children.every((child) => this.evaluateNode(child, features, index));
      } else {
        return node.children.some((child) => this.evaluateNode(child, features, index));
      }
    }

    return false;
  }

  /**
   * Generates entry and exit boolean signal series for a hypothesis
   */
  generateSignals(
    ast: HypothesisAST,
    features: Record<string, number[]>,
    length: number
  ): { entrySignals: boolean[]; exitSignals: boolean[] } {
    const entrySignals = new Array<boolean>(length).fill(false);
    const exitSignals = new Array<boolean>(length).fill(false);

    for (let i = 0; i < length; i++) {
      entrySignals[i] = this.evaluateNode(ast.entryLong, features, i);
      exitSignals[i] = this.evaluateNode(ast.exitLong, features, i);
    }

    return { entrySignals, exitSignals };
  }

  /**
   * Formats an AST condition into readable Arabic and mathematical notation
   */
  formatNodeToString(node: ASTNode, lang: 'ar' | 'math' = 'ar'): string {
    if (node.type === 'condition') {
      const left = node.leftFeature;
      const right = node.rightFeature ? node.rightFeature : (node.threshold ?? 0).toFixed(3);

      if (lang === 'ar') {
        switch (node.operator) {
          case '>': return `${left} أكبر من ${right}`;
          case '<': return `${left} أصغر من ${right}`;
          case '>=': return `${left} أكبر أو يساوي ${right}`;
          case '<=': return `${left} أصغر أو يساوي ${right}`;
          case 'CROSSES_ABOVE': return `${left} يقطع صعوداً فوق ${right}`;
          case 'CROSSES_BELOW': return `${left} يقطع هبوطاً تحت ${right}`;
          case 'BETWEEN': return `${left} محصور بين ${right} و ${node.threshold2 ?? 0}`;
          default: return `${left} ${node.operator} ${right}`;
        }
      } else {
        return `${left} ${node.operator} ${right}`;
      }
    }

    if (node.type === 'group') {
      const connector = lang === 'ar' ? (node.operator === 'AND' ? ' و ' : ' أو ') : ` ${node.operator} `;
      const sub = node.children.map((c) => this.formatNodeToString(c, lang)).join(connector);
      return `(${sub})`;
    }

    return 'تعبير غير معروف';
  }
}

export const safeDsl = new SafeDSLEvaluator();
