import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { coverageEvaluationService } from '../services/rules/coverageEvaluation.service';
import { proportionateDeductionService } from '../services/rules/proportionateDeduction.service';
import { roomUpgradeService } from '../services/rules/roomUpgrade.service';
import { waitingPeriodService } from '../services/rules/waitingPeriod.service';
import { policyService } from '../services/policy.service';
import { sendSuccess } from '../utils/response';
import { AppError } from '../middleware/errorHandler';

export class RulesController {
  async evaluateCoverage(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = req.body;
      let {
        sumInsured,
        inceptionDate,
        roomRentLimitDaily,
        copayPercentage,
        deductibleAmount,
        policyExclusions,
        subLimits
      } = dto;

      // If policyId is provided, enrich with actual policy details
      if (dto.policyId) {
        const isAdmin = req.user?.role === 'admin';
        const policy = await policyService.getPolicyById(dto.policyId, req.user!.id, isAdmin);
        sumInsured = policy.sumInsured;
        inceptionDate = policy.inceptionDate;

        if (policy.roomRentLimit?.limitType === 'FIXED') {
          roomRentLimitDaily = policy.roomRentLimit.dailyLimit;
        } else if (policy.roomRentLimit?.limitType === 'PERCENTAGE' && policy.roomRentLimit.percentage) {
          roomRentLimitDaily = Math.round(policy.sumInsured * (policy.roomRentLimit.percentage / 100));
        }

        if (policy.copayment?.hasCopay) {
          copayPercentage = policy.copayment.percentage;
        }

        if (policy.deductible?.hasDeductible) {
          deductibleAmount = policy.deductible.amount;
        }

        policyExclusions = policy.exclusions || [];
        subLimits = (policy.subLimits || []).map((s) => ({
          category: s.category,
          limitAmount: s.limitAmount
        }));
      }

      if (!sumInsured || !inceptionDate) {
        throw new AppError(
          'Missing policy parameters: sumInsured and inceptionDate must be provided either inline or via a valid policyId.',
          400,
          'MISSING_POLICY_CONTEXT'
        );
      }

      const result = coverageEvaluationService.evaluate({
        ...dto,
        sumInsured,
        inceptionDate,
        roomRentLimitDaily,
        copayPercentage,
        deductibleAmount,
        policyExclusions,
        subLimits
      });

      sendSuccess(res, 200, result);
    } catch (error) {
      next(error);
    }
  }

  async calculateProportionateDeduction(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = proportionateDeductionService.calculate(req.body);
      sendSuccess(res, 200, result);
    } catch (error) {
      next(error);
    }
  }

  async simulateRoomUpgrade(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = roomUpgradeService.simulate(req.body);
      sendSuccess(res, 200, result);
    } catch (error) {
      next(error);
    }
  }

  async checkWaitingPeriod(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = waitingPeriodService.checkEligibility(req.body);
      sendSuccess(res, 200, result);
    } catch (error) {
      next(error);
    }
  }
}

export const rulesController = new RulesController();

