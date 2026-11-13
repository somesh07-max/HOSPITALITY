import { Types } from 'mongoose';
import { Hospital, IHospital } from '../models/hospital.model';
import { HospitalQueryDto } from '../validators/claim.validator';
import { AppError } from '../middleware/errorHandler';
import { VERIFICATION_STATUSES } from '../constants';

export const INITIAL_HOSPITAL_DATA = [
  {
    hospitalName: 'Apollo Hospital Bannerghatta',
    address: '154/11, Opp. IIM-B, Bannerghatta Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560076',
    contactPhone: '+91-80-26304050',
    contactEmail: 'tpa_blr@apollohospitals.com',
    insurerRelationships: [
      { insurerName: 'Star Health', networkStatus: 'IN_NETWORK', cashlessAvailable: true, tpaName: 'Star Health In-House' },
      { insurerName: 'HDFC ERGO', networkStatus: 'IN_NETWORK', cashlessAvailable: true, tpaName: 'HDFC In-House' },
      { insurerName: 'Care Health Insurance', networkStatus: 'IN_NETWORK', cashlessAvailable: true, tpaName: 'Care In-House' },
      { insurerName: 'Niva Bupa', networkStatus: 'IN_NETWORK', cashlessAvailable: true, tpaName: 'Niva In-House' }
    ],
    verificationStatus: VERIFICATION_STATUSES.VERIFIED_OFFICIAL,
    dataSource: 'IRDAI Rohini Registry RegistryID: 890001',
    lastUpdatedDate: new Date('2026-01-15')
  },
  {
    hospitalName: 'Fortis Hospital Mulund',
    address: 'Mulund Goregaon Link Road, Industrial Area, Mulund West',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400078',
    contactPhone: '+91-22-67994444',
    contactEmail: 'insurance.mulund@fortishealthcare.com',
    insurerRelationships: [
      { insurerName: 'Star Health', networkStatus: 'IN_NETWORK', cashlessAvailable: true, tpaName: 'Star Health In-House' },
      { insurerName: 'HDFC ERGO', networkStatus: 'IN_NETWORK', cashlessAvailable: true, tpaName: 'HDFC In-House' },
      { insurerName: 'ICICI Lombard', networkStatus: 'IN_NETWORK', cashlessAvailable: true, tpaName: 'ICICI In-House' }
    ],
    verificationStatus: VERIFICATION_STATUSES.VERIFIED_OFFICIAL,
    dataSource: 'IRDAI Rohini Registry RegistryID: 890042',
    lastUpdatedDate: new Date('2026-01-20')
  },
  {
    hospitalName: 'Max Super Speciality Hospital Saket',
    address: '1, 2, Press Enclave Marg, Saket',
    city: 'New Delhi',
    state: 'Delhi',
    pincode: '110017',
    contactPhone: '+91-11-26515050',
    contactEmail: 'tpa.saket@maxhealthcare.com',
    insurerRelationships: [
      { insurerName: 'Star Health', networkStatus: 'IN_NETWORK', cashlessAvailable: true, tpaName: 'Star Health In-House' },
      { insurerName: 'Care Health Insurance', networkStatus: 'IN_NETWORK', cashlessAvailable: true, tpaName: 'Care In-House' },
      { insurerName: 'Aditya Birla Health', networkStatus: 'IN_NETWORK', cashlessAvailable: true, tpaName: 'Aditya Birla In-House' }
    ],
    verificationStatus: VERIFICATION_STATUSES.VERIFIED_OFFICIAL,
    dataSource: 'IRDAI Rohini Registry RegistryID: 890108',
    lastUpdatedDate: new Date('2026-02-01')
  },
  {
    hospitalName: 'Synthetic Regional Nursing Home',
    address: 'Sector 4, Phase 2, Development Area (Synthetic Test Record)',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560001',
    contactPhone: '+91-80-00000000',
    contactEmail: 'synthetic.test@hospitality.local',
    insurerRelationships: [
      { insurerName: 'Star Health', networkStatus: 'OUT_OF_NETWORK', cashlessAvailable: false }
    ],
    verificationStatus: VERIFICATION_STATUSES.SYNTHETIC_DATA,
    dataSource: 'SYNTHETIC_TEST_FIXTURE_DO_NOT_USE_IN_PRODUCTION',
    lastUpdatedDate: new Date('2026-01-01')
  }
];

export class HospitalService {
  async seedIfEmpty(): Promise<void> {
    const count = await Hospital.countDocuments();
    if (count === 0) {
      await Hospital.insertMany(INITIAL_HOSPITAL_DATA);
    }
  }

  async searchHospitals(query: HospitalQueryDto): Promise<{
    hospitals: IHospital[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: any = {};

    if (query.city) {
      filter.city = { $regex: new RegExp(`^${query.city}$`, 'i') };
    }

    if (query.pincode) {
      filter.pincode = query.pincode.trim();
    }

    if (query.search) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [
        { hospitalName: searchRegex },
        { address: searchRegex },
        { city: searchRegex }
      ];
    }

    if (query.insurerName || query.networkStatus || query.cashlessOnly) {
      const elemMatch: any = {};
      if (query.insurerName) {
        elemMatch.insurerName = { $regex: new RegExp(query.insurerName.trim(), 'i') };
      }
      if (query.networkStatus) {
        elemMatch.networkStatus = query.networkStatus;
      }
      if (query.cashlessOnly) {
        elemMatch.cashlessAvailable = true;
      }
      filter.insurerRelationships = { $elemMatch: elemMatch };
    }

    const [hospitals, total] = await Promise.all([
      Hospital.find(filter).sort({ hospitalName: 1 }).skip(skip).limit(limit),
      Hospital.countDocuments(filter)
    ]);

    return {
      hospitals,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getHospitalById(id: string): Promise<IHospital> {
    const hospital = await Hospital.findById(new Types.ObjectId(id));
    if (!hospital) {
      throw new AppError('Hospital not found', 404, 'HOSPITAL_NOT_FOUND');
    }
    return hospital;
  }
}

export const hospitalService = new HospitalService();

