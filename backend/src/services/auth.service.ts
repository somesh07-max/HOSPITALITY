import { User, UserResponse } from '../models/user.model';
import { RegisterDto, LoginDto, UpdateProfileDto } from '../validators/auth.validator';
import { hashPassword, comparePassword, generateToken } from '../utils/auth';
import { AppError } from '../middleware/errorHandler';

export class AuthService {
  async register(dto: RegisterDto): Promise<{ user: UserResponse; token: string }> {
    const existing = await User.findOne({ email: dto.email.toLowerCase() });
    if (existing) {
      throw new AppError('An account with this email address already exists.', 409, 'DUPLICATE_EMAIL');
    }

    const passwordHash = await hashPassword(dto.password);

    const user = await User.create({
      name: dto.name.trim(),
      email: dto.email.toLowerCase().trim(),
      passwordHash,
      role: dto.role || 'user',
      isActive: true
    });

    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name
    });

    return {
      user: (user.toJSON() as unknown) as UserResponse,
      token
    };
  }

  async login(dto: LoginDto): Promise<{ user: UserResponse; token: string }> {
    const user = await User.findOne({ email: dto.email.toLowerCase().trim() }).select('+passwordHash');
    if (!user) {
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      throw new AppError('Account is deactivated. Please contact support.', 403, 'ACCOUNT_DEACTIVATED');
    }

    const isMatch = await comparePassword(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name
    });

    return {
      user: (user.toJSON() as unknown) as UserResponse,
      token
    };
  }

  async getProfile(userId: string): Promise<UserResponse> {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }
    return (user.toJSON() as unknown) as UserResponse;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserResponse> {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    if (dto.name) {
      user.name = dto.name.trim();
    }

    await user.save();
    return (user.toJSON() as unknown) as UserResponse;
  }
}

export const authService = new AuthService();
