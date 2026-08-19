import OpenAI from 'openai';
import pool from '../config/db.ts';
import logger from '../utils/logger.ts';

interface ChatHistoryMessage {
  role: 'user' | 'assistant' | 'bot';
  content?: string;
  text?: string;
}

export class AIChatService {
  /**
   * Fetch active product and spa service catalog data to ground the AI assistant
   */
  private static async getCatalogContext(): Promise<string> {
    try {
      // 1. Fetch active products
      const productRes = await pool.query(
        `SELECT id, name, category, price, stock_quantity, description 
         FROM products 
         ORDER BY category ASC, name ASC 
         LIMIT 50`
      );

      // 2. Fetch active spa services
      const spaRes = await pool.query(
        `SELECT name, category, price, duration_minutes, description 
         FROM spa_services 
         WHERE is_active = TRUE 
         ORDER BY category ASC, name ASC`
      );

      const productLines = productRes.rows.map((p: any) =>
        `- ${p.name} (${p.category}): ${parseFloat(p.price).toLocaleString('fr-CM')} XAF | Stock: ${p.stock_quantity > 0 ? `${p.stock_quantity} available` : 'Out of stock'} | Description: ${p.description || 'N/A'}`
      ).join('\n');

      const spaLines = spaRes.rows.map((s: any) =>
        `- ${s.name} (${s.category}): ${parseFloat(s.price).toLocaleString('fr-CM')} XAF | Duration: ${s.duration_minutes} min | Description: ${s.description || 'N/A'}`
      ).join('\n');

      return `
OUR REAL PRODUCT CATALOG:
${productLines || 'No physical products currently in stock.'}

OUR REAL SPA SERVICES:
${spaLines || 'No spa services currently scheduled.'}

DELIVERY & LOGISTICS POLICIES:
- Buea (Local): Door-to-door rider delivery (1,500 XAF).
- All Other Cameroonian Towns (Douala, Yaoundé, Bamenda, Limbe, Kribi, Bafoussam, Garoua, Maroua, etc.): Motor Park Agency shipping dispatched from Buea Mile 17 Motor Park (flat rate based on destination town).
- In-Person Spa Pickup: Free at Claire Skiin Sanctuary in Buea.
`;
    } catch (err) {
      logger.error('Failed to fetch catalog context for AI Chat:', err);
      return 'Product catalog temporarily unavailable.';
    }
  }

  /**
   * Process a user chat message with Groq AI (via OpenAI SDK)
   */
  public static async chat(userMessage: string, history: ChatHistoryMessage[] = []): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey || apiKey === 'YOUR_GROQ_API_KEY_HERE' || apiKey.trim() === '') {
      logger.warn('GROQ_API_KEY is missing or unconfigured.');
      return "Hello! I'm Claire, your AI beauty stylist 🌿 Our automated assistant is currently undergoing setup. Please feel free to browse our products online or reach out to our support team on WhatsApp!";
    }

    try {
      const catalogContext = await this.getCatalogContext();

      const systemPrompt = `
You are Claire, the AI Skincare & Beauty Stylist for "Claire Skiin", a luxury Cameroonian skincare brand and spa sanctuary physically based in Buea, Cameroon.

${catalogContext}

STRICT INSTRUCTIONS:
1. Tone & Persona: Warm, elegant, highly knowledgeable in botanical skincare, hospitable, and professional.
2. Product Recommendations: ALWAYS recommend specific products or spa services from the catalog above whenever users ask about skin concerns (e.g. dry skin, acne, anti-aging, hyperpigmentation, body wax, or glowing skin).
3. Pricing & Availability: Always quote exact prices in XAF and highlight availability from the catalog data above. NEVER invent or hallucinate products or prices not in the list.
4. Delivery Details: If asked about shipping, explain local Buea rider delivery (1,500 XAF) vs Mile 17 motor park agency dispatch for other towns in Cameroon.
5. On-Topic Constraint: Stay strictly focused on skincare, cosmetics, beauty rituals, spa services, and store order policies. If asked off-topic questions (e.g., programming, politics, math, general world news), politely decline and offer to help with skincare or beauty rituals instead.
6. Formatting: Keep responses concise, elegant, and readable (use bullet points or bold text where appropriate).
`;

      // Format previous conversation turns (up to last 6 turns to keep context window tight)
      const formattedHistory = history
        .slice(-6)
        .map(h => ({
          role: (h.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: h.content || h.text || '',
        }))
        .filter(h => h.content.trim().length > 0);

      const client = new OpenAI({
        apiKey: apiKey.trim(),
        baseURL: 'https://api.groq.com/openai/v1',
        timeout: 12000, // 12-second timeout safeguard
      });

       // NOTE: Groq rotated/retired its Llama chat catalog. This account's
       // available completion models are listed at GET /openai/v1/models;
       // `llama-3.3-70b-versatile` no longer exists on it and returns a
       // silent 404 model_not_found that this catch block masks as a
       // fallback message. `openai/gpt-oss-20b` is the verified-working
       // choice here (produces a clean, complete reply with no leaked
       // "thinking" preamble, unlike qwen/qwen3.6-27b).
       const response = await client.chat.completions.create({
         model: 'openai/gpt-oss-20b',
        messages: [
          { role: 'system', content: systemPrompt },
          ...formattedHistory,
          { role: 'user', content: userMessage },
        ],
        max_tokens: 600,
        temperature: 0.6,
      });

      const aiReply = response.choices[0]?.message?.content;

      if (!aiReply) {
        return "I apologize, but I couldn't generate a response just now. How else may I assist you with your skin ritual?";
      }

      return aiReply;
    } catch (error: any) {
      logger.error('Error calling Groq LLM API:', error);
      return "I'm temporarily having trouble accessing my beauty knowledge base. Please feel free to explore our products directly on the website or try again in a moment!";
    }
  }
}
