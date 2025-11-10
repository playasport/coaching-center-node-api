import { UserModel, User, UserDocument } from '../models/user.model';
import { hashPassword } from '../utils/password';

export interface CreateUserData {
  id: string;
  email: string;
  firstName: string;
  lastName?: string | null;
  mobile?: string | null;
  gender?: 'male' | 'female' | 'other';
  password: string;
  role: string;
  isActive?: boolean;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string | null;
  mobile?: string | null;
  gender?: 'male' | 'female' | 'other';
  password?: string;
  role?: string;
  isActive?: boolean;
  isDeleted?: boolean;
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

const fetchRawByQuery = (query: Record<string, unknown>) =>
  UserModel.findOne(query).lean<User & { password: string } | null>();

export const userService = {
  sanitize(document: User | UserDocument | (User & { password?: string }) | null): User | null {
    return toPlain(document);
  },

  async create(data: CreateUserData): Promise<User> {
    const hashedPassword = await hashPassword(data.password);

    const doc = await UserModel.create({
      id: data.id,
      email: data.email.toLowerCase(),
      firstName: data.firstName,
      lastName: data.lastName ?? null,
      mobile: data.mobile ?? null,
      gender: data.gender ?? null,
      password: hashedPassword,
      role: {
        id: data.role,
        name: data.role,
      },
      isActive: data.isActive ?? true,
    });

    const sanitized = this.sanitize(doc);
    if (!sanitized) {
      throw new Error('Failed to sanitize user document after creation');
    }
    return sanitized;
  },

  async update(id: string, data: UpdateUserData): Promise<User | null> {
    const update: UpdateUserData = { ...data };

    if (data.password) {
      update.password = await hashPassword(data.password);
    }

    const doc = await UserModel.findOneAndUpdate({ id }, update, {
      new: true,
      projection: defaultProjection,
    });

    return this.sanitize(doc);
  },

  async findByEmail(email: string): Promise<User | null> {
    const doc = await UserModel.findOne({ email: email.toLowerCase() })
      .select(defaultProjection)
      .lean<User | null>();
    return this.sanitize(doc);
  },

  async findByEmailWithPassword(email: string) {
    return fetchRawByQuery({ email: email.toLowerCase() });
  },

  async findByMobile(mobile: string): Promise<User | null> {
    const doc = await UserModel.findOne({ mobile })
      .select(defaultProjection)
      .lean<User | null>();
    return this.sanitize(doc);
  },

  async findByMobileWithPassword(mobile: string) {
    return fetchRawByQuery({ mobile });
  },

  async findById(id: string): Promise<User | null> {
    const doc = await UserModel.findOne({ id })
      .select(defaultProjection)
      .lean<User | null>();
    return this.sanitize(doc);
  },
};


