import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.ts';
import { ReviewService } from '../services/review.service.ts';
import { AppError } from '../middleware/error.middleware.ts';

// ── Public ────────────────────────────────────────────────────────────────────

/**
 * GET /api/products/:productId/reviews
 * Public. Returns approved reviews + aggregate rating.
 * The authenticated viewer's own pending review is also included if present.
 */
export const listReviewsController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const productId = parseInt(req.params.productId, 10);
    if (isNaN(productId)) throw new AppError('Invalid product ID.', 400);

    const page  = parseInt((req.query.page  as string) || '1',  10);
    const limit = parseInt((req.query.limit as string) || '10', 10);
    const viewerUserId = req.user?.id ?? null;

    const data = await ReviewService.listForProduct(productId, page, limit, viewerUserId);
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};

/**
 * POST /api/products/:productId/reviews
 * Authenticated. Submit a new review.
 */
export const createReviewController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const productId = parseInt(req.params.productId, 10);
    if (isNaN(productId)) throw new AppError('Invalid product ID.', 400);

    const userId = req.user!.id;
    const { rating, title, body } = req.body;

    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      throw new AppError('Rating must be an integer between 1 and 5.', 400);
    }
    if (!body || typeof body !== 'string' || body.trim().length < 10) {
      throw new AppError('Review body must be at least 10 characters.', 400);
    }

    const review = await ReviewService.create({
      userId,
      productId,
      rating: Math.floor(rating),
      title: title?.trim() || null,
      body: body.trim(),
    });

    res.status(201).json({
      success: true,
      message: 'Review submitted! It will appear publicly after moderation.',
      data: review,
    });
  } catch (error) { next(error); }
};

/**
 * PUT /api/products/:productId/reviews/:reviewId
 * Authenticated. Customer edits their own review (only if pending).
 */
export const updateReviewController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const reviewId = parseInt(req.params.reviewId, 10);
    if (isNaN(reviewId)) throw new AppError('Invalid review ID.', 400);

    const userId = req.user!.id;
    const { rating, title, body } = req.body;

    const updates: any = {};
    if (rating !== undefined) updates.rating = Math.floor(Number(rating));
    if ('title' in req.body) updates.title = title?.trim() || null;
    if (body !== undefined) updates.body = body.trim();

    const review = await ReviewService.update(reviewId, userId, updates);
    res.status(200).json({
      success: true,
      message: 'Review updated. It is pending approval again.',
      data: review,
    });
  } catch (error) { next(error); }
};

/**
 * POST /api/reviews/:reviewId/report
 * Authenticated. Report a review for abuse.
 */
export const reportReviewController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const reviewId = parseInt(req.params.reviewId, 10);
    if (isNaN(reviewId)) throw new AppError('Invalid review ID.', 400);

    const reporterUserId = req.user!.id;
    const { reason } = req.body;

    if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
      throw new AppError('A reason of at least 5 characters is required.', 400);
    }

    const report = await ReviewService.report(reviewId, reporterUserId, reason);
    res.status(201).json({
      success: true,
      message: 'Thank you — this review has been flagged for admin review.',
      data: report,
    });
  } catch (error) { next(error); }
};

// ── Admin ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/reviews
 * Admin/Manager. List all reviews, filterable by status.
 */
export const adminListReviewsController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const status = req.query.status as string | undefined;
    const validStatuses = ['pending', 'approved', 'rejected', 'hidden'];
    if (status && !validStatuses.includes(status)) {
      throw new AppError(`Invalid status filter. Must be one of: ${validStatuses.join(', ')}.`, 400);
    }

    const reviews = await ReviewService.adminList(status);
    res.status(200).json({ success: true, data: reviews });
  } catch (error) { next(error); }
};

/**
 * PUT /api/admin/reviews/:id/status
 * Admin/Manager. Approve, reject, or hide a review.
 */
export const adminUpdateReviewStatusController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw new AppError('Invalid review ID.', 400);

    const { status } = req.body;
    if (!status) throw new AppError('status is required.', 400);

    const review = await ReviewService.adminUpdateStatus(id, status);
    res.status(200).json({
      success: true,
      message: `Review ${status}.`,
      data: review,
    });
  } catch (error) { next(error); }
};

/**
 * GET /api/admin/reviews/reports
 * Admin/Manager. List abuse reports.
 */
export const adminListReportsController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const status = req.query.status as string | undefined;
    const reports = await ReviewService.adminListReports(status);
    res.status(200).json({ success: true, data: reports });
  } catch (error) { next(error); }
};

/**
 * PUT /api/admin/reviews/reports/:id/status
 * Admin/Manager. Dismiss or mark a report as reviewed.
 */
export const adminUpdateReportStatusController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) throw new AppError('Invalid report ID.', 400);

    const { status } = req.body;
    const report = await ReviewService.adminUpdateReportStatus(id, status);
    res.status(200).json({ success: true, data: report });
  } catch (error) { next(error); }
};
