import { UserModel, User, UserDocument } from '../models/user.model';
import { RoleModel } from '../models/role.model';
import { Address } from '../models/address.model';
import { hashPassword } from '../utils/password';
import { ApiError } from '../utils/ApiError';
import { t } from '../utils/i18n';

export interface CreateUserData {
  id: string;
  email: string;
  firstName: string;
  lastName?: string | null;
  mobile?: string | null;
  gender?: 'male' | 'female' | 'other';
  dob?: Date | null;
  password: string;
  role: string;
  isActive?: boolean;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string | null;
  mobile?: string | null;
  email?: string;
  gender?: 'male' | 'female' | 'other';
  dob?: Date | null;
  profileImage?: string | null;
  password?: string;
  role?: string;
  isActive?: boolean;
  isDeleted?: boolean;
  address?: Partial<Address> | null;
}

const defaultProjection = {
  _id: 0,
  password: 0,
};

const toPlain = (document: any): User | null => {
  if (!document) {
    return null;
  }
  const plain =
    typeof document === 'object' && 'toObject' in document
      ? document.toObject()
      : document;
  const { password: _password, ...rest } = plain;
  return rest as User;
};

export const userService = {
  sanitize(document: User | UserDocument | (User & { password?: string }) | null): User | null {
    return toPlain(document);
  },

  async create(data: CreateUserData): Promise<User> {
    const hashedPassword = await hashPassword(data.password);

    // Find role by name to get ObjectId (default to 'user' if not provided)
    const roleName = data.role || 'user';
    const role = await RoleModel.findOne({ name: roleName });
    if (!role) {
      throw new ApiError(404, t('errors.roleNotFound', { role: roleName }));
    }

    const doc = await UserModel.create({
      id: data.id,
      email: data.email.toLowerCase(),
      firstName: data.firstName,
      lastName: data.lastName ?? null,
      mobile: data.mobile ?? null,
      gender: data.gender ?? null,
      dob: data.dob ?? null,
      password: hashedPassword,
      role: role._id, // Use Role ObjectId
      isActive: data.isActive ?? true,
    });

    // Populate role before returning
    const populatedDoc = await UserModel.findById(doc._id)
      .populate('role', 'name description')
      .lean();

    const sanitized = this.sanitize(populatedDoc);
    if (!sanitized) {
      throw new ApiError(500, t('errors.internalServerError'));
    }
    return sanitized;
  },

  async update(id: string, data: UpdateUserData): Promise<User | null> {
    const update: any = { ...data };

    if (data.password) {
      update.password = await hashPassword(data.password);
    }

    if (data.email) {
      update.email = data.email.toLowerCase();
    }

    // If role is being updated, find role ObjectId by name
    if (data.role) {
      const role = await RoleModel.findOne({ name: data.role });
      if (!role) {
        throw new ApiError(404, t('errors.roleNotFound', { role: data.role }));
      }
      update.role = role._id;
    }

    const doc = await UserModel.findOneAndUpdate({ id }, update, {
      new: true,
      projection: defaultProjection,
    })
      .populate('role', 'name description')
      .lean();

    return this.sanitize(doc);
  },

  async findByEmail(email: string): Promise<User | null> {
    const doc = await UserModel.findOne({ email: email.toLowerCase() })
      .select(defaultProjection)
      .populate('role', 'name description')
      .lean<User | null>();
    return this.sanitize(doc);
  },

  async findByEmailWithPassword(email: string) {
    const doc = await UserModel.findOne({ email: email.toLowerCase() })
      .populate('role', 'name description')
      .lean<User & { password: string } | null>();
    return doc;
  },

  async findByMobile(mobile: string): Promise<User | null> {
    const doc = await UserModel.findOne({ mobile })
      .select(defaultProjection)
      .populate('role', 'name description')
      .lean<User | null>();
    return this.sanitize(doc);
  },

  async findByMobileWithPassword(mobile: string) {
    const doc = await UserModel.findOne({ mobile })
      .populate('role', 'name description')
      .lean<User & { password: string } | null>();
    return doc;
  },

  async findById(id: string): Promise<User | null> {
    const doc = await UserModel.findOne({ id })
      .select(defaultProjection)
      .populate('role', 'name description')
      .lean<User | null>();
    return this.sanitize(doc);
  },

  async findByIdWithPassword(id: string) {
    const doc = await UserModel.findOne({ id })
      .populate('role', 'name description')
      .lean<User & { password: string } | null>();
    return doc;
  },
};


