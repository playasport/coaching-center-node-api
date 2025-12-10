import { UserModel, User, UserDocument } from '../models/user.model';
import { RoleModel } from '../models/role.model';
import { Address } from '../models/address.model';
import { hashPassword } from '../utils/password';
import { ApiError } from '../utils/ApiError';
import { t } from '../utils/i18n';
import { ParticipantModel } from '../models/participant.model';
import { Types } from 'mongoose';
import { logger } from '../utils/logger';

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

    // Create participant record with isSelf = '1'
    try {
      // Map gender from string to number (male=0, female=1, other=2)
      let genderNumber: number | null = null;
      if (data.gender) {
        const genderMap: Record<string, number> = {
          male: 0,
          female: 1,
          other: 2,
        };
        genderNumber = genderMap[data.gender] ?? null;
      }

      const participantData = {
        userId: doc._id,
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        gender: genderNumber,
        disability: 0, // Default to no disability
        dob: data.dob || null,
        contactNumber: data.mobile || null,
        profilePhoto: null, // Will be updated when user uploads profile image
        address: null, // Will be updated when user adds address
        isSelf: '1', // Mark as self
        is_active: true,
        is_deleted: false,
      };

      await ParticipantModel.create(participantData);
      logger.info(`Participant record created for user: ${data.id}`, { userId: data.id });
    } catch (participantError) {
      // Log error but don't fail user creation
      logger.error('Failed to create participant record for user:', {
        userId: data.id,
        error: participantError instanceof Error ? participantError.message : participantError,
      });
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

    const sanitized = this.sanitize(doc);
    if (!sanitized) {
      return null;
    }

    // Update participant record with isSelf = '1' if it exists
    try {
      // Get user ObjectId
      const userDoc = await UserModel.findOne({ id }).select('_id').lean();
      if (!userDoc) {
        return sanitized;
      }

      // Find the participant record with isSelf = '1'
      const participant = await ParticipantModel.findOne({
        userId: userDoc._id,
        isSelf: '1',
        is_deleted: false,
      });

      if (participant) {
        // Prepare update data
        const participantUpdate: any = {};

        if (data.firstName !== undefined) {
          participantUpdate.firstName = data.firstName || null;
        }
        if (data.lastName !== undefined) {
          participantUpdate.lastName = data.lastName ?? null;
        }
        if (data.gender !== undefined) {
          // Map gender from string to number
          let genderNumber: number | null = null;
          if (data.gender) {
            const genderMap: Record<string, number> = {
              male: 0,
              female: 1,
              other: 2,
            };
            genderNumber = genderMap[data.gender] ?? null;
          }
          participantUpdate.gender = genderNumber;
        }
        if (data.dob !== undefined) {
          participantUpdate.dob = data.dob || null;
        }
        if (data.mobile !== undefined) {
          participantUpdate.contactNumber = data.mobile || null;
        }
        if (data.profileImage !== undefined) {
          participantUpdate.profilePhoto = data.profileImage || null;
        }
        if (data.address !== undefined) {
          participantUpdate.address = data.address || null;
        }

        // Only update if there are changes
        if (Object.keys(participantUpdate).length > 0) {
          await ParticipantModel.findByIdAndUpdate(participant._id, participantUpdate, { new: true });
          logger.info(`Participant record updated for user: ${id}`, { userId: id });
        }
      }
    } catch (participantError) {
      // Log error but don't fail user update
      logger.error('Failed to update participant record for user:', {
        userId: id,
        error: participantError instanceof Error ? participantError.message : participantError,
      });
    }

    return sanitized;
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


