import { AdminUserModel, AdminUser, AdminUserDocument } from '../../models/adminUser.model';
import { Address } from '../../models/address.model';
import { hashPassword } from '../../utils/password';
import { ApiError } from '../../utils/ApiError';
import { t } from '../../utils/i18n';
import { Types } from 'mongoose';

export interface CreateAdminUserData {
  id: string;
  email: string;
  firstName: string;
  lastName?: string | null;
  mobile?: string | null;
  gender?: 'male' | 'female' | 'other';
  dob?: Date | null;
  password: string;
  roles: Types.ObjectId[]; // Array of role ObjectIds
  isActive?: boolean;
  address?: Address | null;
}

export interface UpdateAdminUserData {
  firstName?: string;
  lastName?: string | null;
  mobile?: string | null;
  email?: string;
  gender?: 'male' | 'female' | 'other';
  dob?: Date | null;
  profileImage?: string | null;
  password?: string;
  roles?: Types.ObjectId[];
  isActive?: boolean;
  isDeleted?: boolean;
  address?: Partial<Address> | null;
}

const defaultProjection = {
  _id: 0,
  password: 0,
};

const toPlain = (document: any): AdminUser | null => {
  if (!document) {
    return null;
  }
  const plain =
    typeof document === 'object' && 'toObject' in document
      ? document.toObject()
      : document;
  const { password: _password, ...rest } = plain;
  return rest as AdminUser;
};

export const adminUserService = {
  sanitize(document: AdminUser | AdminUserDocument | (AdminUser & { password?: string }) | null): AdminUser | null {
    return toPlain(document);
  },

  async create(data: CreateAdminUserData): Promise<AdminUser> {
    const hashedPassword = await hashPassword(data.password);

    const doc = await AdminUserModel.create({
      id: data.id,
      email: data.email.toLowerCase(),
      firstName: data.firstName,
      lastName: data.lastName ?? null,
      mobile: data.mobile ?? null,
      gender: data.gender ?? null,
      dob: data.dob ?? null,
      password: hashedPassword,
      roles: data.roles,
      isActive: data.isActive ?? true,
      address: data.address ?? null,
    });

    // Populate roles before returning
    const populatedDoc = await AdminUserModel.findById(doc._id)
      .populate('roles', 'name description')
      .lean();

    const sanitized = this.sanitize(populatedDoc);
    if (!sanitized) {
      throw new ApiError(500, t('errors.internalServerError'));
    }

    return sanitized;
  },

  async update(id: string, data: UpdateAdminUserData): Promise<AdminUser | null> {
    const update: any = { ...data };

    if (data.password) {
      update.password = await hashPassword(data.password);
    }

    if (data.email) {
      update.email = data.email.toLowerCase();
    }

    // If roles are being updated
    if (data.roles !== undefined) {
      update.roles = data.roles;
    }

    const doc = await AdminUserModel.findOneAndUpdate({ id }, update, {
      new: true,
      projection: defaultProjection,
    })
      .populate('roles', 'name description')
      .lean();

    const sanitized = this.sanitize(doc);
    return sanitized;
  },

  async findByEmail(email: string): Promise<AdminUser | null> {
    const doc = await AdminUserModel.findOne({ email: email.toLowerCase() })
      .select(defaultProjection)
      .populate('roles', 'name description')
      .lean<AdminUser | null>();
    return this.sanitize(doc);
  },

  async findByEmailWithPassword(email: string) {
    const doc = await AdminUserModel.findOne({ email: email.toLowerCase() })
      .populate('roles', 'name description')
      .lean<AdminUser & { password: string } | null>();
    return doc;
  },

  async findByMobile(mobile: string): Promise<AdminUser | null> {
    const doc = await AdminUserModel.findOne({ mobile })
      .select(defaultProjection)
      .populate('roles', 'name description')
      .lean<AdminUser | null>();
    return this.sanitize(doc);
  },

  async findByMobileWithPassword(mobile: string) {
    const doc = await AdminUserModel.findOne({ mobile })
      .populate('roles', 'name description')
      .lean<AdminUser & { password: string } | null>();
    return doc;
  },

  async findById(id: string): Promise<AdminUser | null> {
    const doc = await AdminUserModel.findOne({ id })
      .select(defaultProjection)
      .populate('roles', 'name description')
      .lean<AdminUser | null>();
    return this.sanitize(doc);
  },

  async findByIdWithPassword(id: string) {
    const doc = await AdminUserModel.findOne({ id })
      .populate('roles', 'name description')
      .lean<AdminUser & { password: string } | null>();
    return doc;
  },
};
