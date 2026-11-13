import { Request, Response, NextFunction } from 'express';
import { hospitalService } from '../services/hospital.service';
import { sendSuccess } from '../utils/response';

export class HospitalController {
  async searchHospitals(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await hospitalService.seedIfEmpty();
      const result = await hospitalService.searchHospitals(req.query as any);
      sendSuccess(res, 200, result);
    } catch (error) {
      next(error);
    }
  }

  async getHospitalById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hospital = await hospitalService.getHospitalById(req.params.id);
      sendSuccess(res, 200, hospital);
    } catch (error) {
      next(error);
    }
  }
}

export const hospitalController = new HospitalController();

