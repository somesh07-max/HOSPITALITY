import { Request } from 'express';
import { UserRole } from '../constants';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface DecisionTraceItem {
  ruleId: string;
  description: string;
  clauseReference: string;
  verificationStatus: string;
  inputs: Record<string, any>;
  calculationSteps: string[];
  output: Record<string, any>;
  timestamp: string;
}

