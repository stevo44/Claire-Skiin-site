import { Request, Response } from 'express';
import { AIChatService } from '../services/ai-chat.service.ts';
import logger from '../utils/logger.ts';

export const handleAIChat = async (req: Request, res: Response) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ message: 'Message is required and cannot be empty.' });
    }

    const reply = await AIChatService.chat(message.trim(), Array.isArray(history) ? history : []);

    return res.json({
      success: true,
      data: {
        message: reply,
        role: 'assistant',
      },
    });
  } catch (error: any) {
    logger.error('AIChat Controller Error:', error);
    return res.status(500).json({
      message: 'An error occurred while processing your chat message.',
      fallback: "Hello! I'm Claire. I'm currently unable to respond, but feel free to explore our products or contact our team via WhatsApp!",
    });
  }
};
