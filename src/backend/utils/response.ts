import { Response } from 'express';

export const sendResponse = (res: Response, statusCode: number, status: string, data: any = null, message: string = '') => {
  res.status(statusCode).json({
    status,
    message,
    data
  });
};

export const sendSuccess = (res: Response, data: any = null, message: string = '', statusCode: number = 200) => {
  sendResponse(res, statusCode, 'success', data, message);
};

export const sendError = (res: Response, message: string = 'Error', statusCode: number = 500) => {
  sendResponse(res, statusCode, 'error', null, message);
};
