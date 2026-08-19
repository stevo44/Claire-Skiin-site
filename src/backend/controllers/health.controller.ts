import { Request, Response } from "express";
import pool from "../config/db.ts";
import logger from '../utils/logger.ts';

export const getHealth = async (req: Request, res: Response) => {
  try {
    // Check DB connection
    const dbCheck = await pool.query("SELECT NOW()");
    
    res.status(200).json({
      status: "success",
      message: "Backend is healthy",
      timestamp: new Date().toISOString(),
      database: "connected",
      dbTime: dbCheck.rows[0].now
    });
  } catch (error) {
    logger.error("Health check failed:", error);
    res.status(500).json({
      status: "error",
      message: "Backend is unhealthy",
      database: "disconnected",
      error: error instanceof Error ? error.message : String(error)
    });
  }
};
