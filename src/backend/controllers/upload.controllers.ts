import { Request, Response, NextFunction } from 'express';
import { fileTypeFromBuffer, ALLOWED_IMAGE_MIMES, writeVerifiedBufferToDisk } from '../middleware/upload.middlewear.ts';
import { AppError } from '../middleware/error.middleware.ts';

// Multer augments Express.Request with a `file` property once @types/multer is installed.
type MulterRequest = Request & { file?: Express.Multer.File };

/**
 * @desc  Upload a product image from the admin's computer
 * @route POST /api/admin/upload/image
 * @access Admin only
 */
export const uploadProductImage = async (req: MulterRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file provided. Send multipart/form-data with field "image".' });
    }

    // Security boundary: verify actual file content via magic-byte
    // detection, independent of the client-supplied Content-Type header
    // (checked earlier, cheaply, by multer's fileFilter) and independent
    // of the client-supplied original filename/extension (never trusted).
    const detected = await fileTypeFromBuffer(req.file.buffer);

    if (!detected || !ALLOWED_IMAGE_MIMES.includes(detected.mime)) {
      throw new AppError('File content does not match an allowed image type (JPEG, PNG, WebP, GIF).', 400);
    }

    // Only after content verification passes do we write to disk, using
    // the detected (verified) extension — never the client-supplied one.
    const filename = writeVerifiedBufferToDisk(req.file.buffer, detected.mime);

    // Public URL served by Express static middleware at /uploads/products/<filename>
    const url = `/uploads/products/${filename}`;
    res.status(200).json({
      message: 'Image uploaded successfully',
      url,
      filename,
      originalName: req.file.originalname,
      size: req.file.size,
    });
  } catch (error) {
    next(error);
  }
};
