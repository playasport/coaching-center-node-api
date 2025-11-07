import prisma from '../config/database';
import { hashPassword } from '../utils/password';
import { v4 as uuidv4 } from 'uuid';

export interface CreateCoachingCentreData {
  email: string;
  password: string;
  coachingName: string;
  firstName?: string;
  lastName?: string;
  mobileNumber?: string;
  contactEmail?: string;
  contactNumber?: string;
}

export interface UpdateCoachingCentreData {
  coachingName?: string;
  firstName?: string;
  lastName?: string;
  mobileNumber?: string;
  contactEmail?: string;
  contactNumber?: string;
  password?: string;
  isAdminApprove?: string;
  isActive?: boolean;
}

const defaultSelect = {
  id: true,
  email: true,
  coachingName: true,
  firstName: true,
  lastName: true,
  mobileNumber: true,
  contactEmail: true,
  contactNumber: true,
  isAdminApprove: true,
  isActive: true,
  signupDateTime: true,
  updatedAt: true,
};

export const coachingCentreService = {
  async findById(id: string) {
    return prisma.coachingCentre.findUnique({
      where: { id },
      select: defaultSelect,
    });
  },

  async findByEmail(email: string) {
    return prisma.coachingCentre.findUnique({
      where: { email },
    });
  },

  async create(data: CreateCoachingCentreData) {
    const hashedPassword = await hashPassword(data.password);

    return prisma.coachingCentre.create({
      data: {
        id: uuidv4(),
        email: data.email,
        password: hashedPassword,
        coachingName: data.coachingName,
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
        mobileNumber: data.mobileNumber ?? null,
        contactEmail: data.contactEmail ?? null,
        contactNumber: data.contactNumber ?? null,
        signupDateTime: new Date(),
        isActive: true,
        isAdminApprove: 'pending_approval',
      },
      select: defaultSelect,
    });
  },

  async update(id: string, data: UpdateCoachingCentreData) {
    const updateData = { ...data } as UpdateCoachingCentreData & { password?: string };

    if (data.password) {
      updateData.password = await hashPassword(data.password);
    }

    return prisma.coachingCentre.update({
      where: { id },
      data: updateData,
      select: defaultSelect,
    });
  },

  async delete(id: string) {
    return prisma.coachingCentre.delete({
      where: { id },
    });
  },
};


