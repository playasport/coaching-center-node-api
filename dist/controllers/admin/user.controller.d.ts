import { Request, Response } from 'express';
export declare const createUser: (req: Request, res: Response) => Promise<void>;
/**
 * Get all users (admin view) with filters
 */
export declare const getAllUsers: (req: Request, res: Response) => Promise<void>;
/**
 * Get user by ID (admin view)
 * Supports both UUID id and MongoDB _id for backward compatibility
 * Includes: participants, bookings, enrolled batches, and active batches (latest 5 each)
 */
export declare const getUser: (req: Request, res: Response) => Promise<void>;
/**
 * Update user (admin)
 * Super admin can update email and password
 */
export declare const updateUser: (req: Request, res: Response) => Promise<void>;
/**
 * Toggle user status (admin)
 */
export declare const toggleUserStatus: (req: Request, res: Response) => Promise<void>;
/**
 * Delete user (admin - soft delete)
 */
export declare const deleteUser: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=user.controller.d.ts.map