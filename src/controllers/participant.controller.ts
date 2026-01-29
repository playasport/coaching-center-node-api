import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { t } from '../utils/i18n';
import * as participantService from '../services/client/participant.service';
import type { ParticipantCreateInput, ParticipantUpdateInput } from '../validations/participant.validation';

export const createParticipant = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = req.body as ParticipantCreateInput;

    if (!req.user || !req.user.id) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    // Always set userId from logged-in user (userId in request body is ignored)
    // Pass file if uploaded
    const participant = await participantService.createParticipant(
      data,
      req.user.id,
      req.file
    );

    const response = new ApiResponse(
      201,
      { participant },
      t('participant.create.success')
    );
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

export const getParticipant = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new ApiError(400, t('participant.idRequired'));
    }

    if (!req.user || !req.user.id) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    const participant = await participantService.getParticipantById(id, req.user.id);

    if (!participant) {
      throw new ApiError(404, t('participant.notFound'));
    }

    const response = new ApiResponse(
      200,
      { ...participant },
      t('participant.get.success')
    );
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const updateParticipant = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new ApiError(400, t('participant.idRequired'));
    }

    if (!req.user || !req.user.id) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    const data = req.body as ParticipantUpdateInput;

    // Pass file if uploaded
    const participant = await participantService.updateParticipant(
      id,
      data,
      req.user.id,
      req.file
    );

    if (!participant) {
      throw new ApiError(404, t('participant.notFound'));
    }

    const response = new ApiResponse(
      200,
      { participant },
      t('participant.update.success')
    );
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const deleteParticipant = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new ApiError(400, t('participant.idRequired'));
    }

    if (!req.user || !req.user.id) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    await participantService.deleteParticipant(id, req.user.id);

    const response = new ApiResponse(
      200,
      {},
      t('participant.delete.success')
    );
    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const getMyParticipants = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      throw new ApiError(401, t('auth.authorization.unauthorized'));
    }

    // Get pagination parameters from query
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await participantService.getParticipantsByUser(
      req.user.id,
      page,
      limit
    );

    const response = new ApiResponse(
      200,
      result,
      t('participant.list.success')
    );
    res.json(response);
  } catch (error) {
    next(error);
  }
};

