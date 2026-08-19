import { Product } from '../store/cartStore';

export const PRODUCTS: Product[] = [
  { id:1, name:'Radiance Elixir', category:'Skincare', sub:'Brightening Serum', price:85000, priceDisplay:'85,000 XAF', badge:'Best Seller', img:'https://lh3.googleusercontent.com/aida-public/AB6AXuCvi48xMia9DLLZTj5YvlVIHkFjbNaPmZcKj7FUjgRgPclIk3BuYo9FkZDwU4FHqI81TCH_pndeXUWwTlQOGOUpDjdrfBgM_P503gk5E_Fq9jVg4CfgYjIb1I56FB8tm4SFwnHuOOYx5ac87hc1HSVy3ANODLaOOH2078NYQluo8HuL6oNd_ivsdmnE7mbosOYJmSu7Ly5Rb_ZTjAnTR5v5LcrDX7WfTcK2XjdwmzbPO2WvWJHJFHRT6uRk2zwhr1D977Wvj1LFpIQ', desc:'An exquisite blend of African botanical extracts and modern peptides designed to restore your skin\'s natural luminosity.', ingredients:['Baobab Extract','Thermal Spring Water','Bio-Peptides'], benefits:['Luminous Glow','Deep Hydration','Anti-Aging'] },
  { id:2, name:'Forest Glow Balm', category:'Skincare', sub:'Intense Hydration', price:62000, priceDisplay:'62,000 XAF', img:'https://lh3.googleusercontent.com/aida-public/AB6AXuDCnj2F9wIwWXKQ_jJHYn9Ulxy2vnKzHR3oA-rR-9v7Zncb4kwjpU7ljMCATKZOK7e9zs3Qgka9IGiLG2DEO2mwCwqqgzB0ypHwgtd9toGLNZ-RoafazLoW-dPWZl6ZQkWmGVNxU5LJSF7gtnuDGWSxGTbTOZHFD04xLHaTjbHqXPeURenpNPfklfh5w2u_9z8fucEYz-dOmx3Ytgh70y2IRCBaH7IvXMXCQ0vpnEXUoGJnLjnJfHNjNHgY1tQluwHzNOBT36PENdo', desc:'Rich body butter infused with shea and Cameroonian forest extracts for lasting hydration.', ingredients:['Shea Butter','Forest Extract','Vitamin E'], benefits:['24hr Moisture','Skin Softening','Natural Glow'] },
  { id:3, name:'Volcanic Clay Mask', category:'Skincare', sub:'Detoxifying Ritual', price:54000, priceDisplay:'54,000 XAF', img:'https://lh3.googleusercontent.com/aida-public/AB6AXuAt6vLgGYGfMU9ZWcXvqIXpWfQuE5V6GLbdf9o_ERbldxOAJcr9x9ZRR-rnmf3FZMZtvyGEVxfS3jR1KtVR9FttwfilabM6S2hC_Qfk3ZtCPPQNhqS2N05QIa40ICpRg9PIOAU63fcUrkOsZVS1f0cLMu7H94fZmsST9mG-yJ-GvqaCpNAwDBsXcsuhs89JeCcsBK1i1kvwUgFWYU5upv9-fDZ_Wf73KWwsOE-8-is7O3ssbdpwxaRPGHZmLYZVRAd70JyUdverAYE', desc:'Deep detox clay mask with volcanic minerals to purify and refine skin texture.', ingredients:['Volcanic Clay','Activated Charcoal','Moringa Extract'], benefits:['Deep Cleanse','Pore Minimizing','Radiant Skin'] },
  { id:4, name:'Savanna Silk Oil', category:'Hair Care', sub:'Restorative Hair Oil', price:78000, priceDisplay:'78,000 XAF', badge:'New', img:'https://lh3.googleusercontent.com/aida-public/AB6AXuDhWCx4-RKmzATgXn7fQTjefdmhErLgIIkaijnO8RewxWIwOJ0c85D3BK_z9hR9fyOwQSVdx5PbWOIssnQzj_zJtjhYQD-0-KjM0k1T20cPleq5T_ziNuPnOQg5iA_r2em9nEF5u4cFLsLsucRJcH_hIxwtqBGz8X_jg-4ggv33Cjv_sP4ZwOg99fCtY_ENeJDnva5M_RD8SjBmLujRUzgoO0dDRsykkSP0wR-Baf2dY0j4EVUzLRO5xyejsQHVRj6-DWP03re0E1s', desc:'Luxurious hair oil crafted from Savanna botanicals for silky, revitalized tresses.', ingredients:['Argan Oil','Bambara Nut','Hibiscus Extract'], benefits:['Frizz Control','Deep Nourishment','Shine Boost'] },
  { id:5, name:'Cocoa Glaze Balm', category:'Lip Care', sub:'Daily Lip Ritual', price:14500, priceDisplay:'14,500 XAF', img:'https://lh3.googleusercontent.com/aida-public/AB6AXuAunigNCUNeXbzNL7oulufe6T4jmrzWLVwjivuM1c7ehgk28likuj9OvSgpKCpwr-SZTTIOGoD0txRqBEBApGOm6iZriKmEvOpfWpIDhZ2fvVaRK8Eg-JMKeVNv6mUx0Mpvv-bSr8-53MHiT6MKLNIjwMGSR5iG3c8mu5Wa9AhPu63o6u69rOC9rs0EoDFOl49Yv2CT2NLZn70W8IEeqJyTo7ycNqu22yHX8yLPoFEdbWX_pjySPZYCeUMT4', desc:'Rich cocoa butter lip balm for deeply moisturized, kissable lips all day long.', ingredients:['Cocoa Butter','Beeswax','Vitamin C'], benefits:['Intense Moisture','Plumping Effect','Natural Gloss'] },
  { id:6, name:'Volcanic Earth Polish', category:'Skincare', sub:'Exfoliation Ritual', price:33500, priceDisplay:'33,500 XAF', img:'https://lh3.googleusercontent.com/aida-public/AB6AXuDq2isCrwzg26fxlUvEHebYvE926YBuDCFfcU8crCtQny1FSkS0tYXs7SNHSaKCn6-wfa2I6fVPpn4tcxAn7K2CDC3s232BK607QcHldvpCEkNECS7m3YJ0sj-NWxcEctA4KJocE4Tzd8jMuVMPAtIbLp0voyLtV50xGJXhmq2mncjpTqQkxaLlFgAvrZ6-3cFGdcc_CvgD3Z0iUHHIG515fBwBKljQtWk', desc:'Artisan volcanic salt scrub that buffs away dullness for silky smooth, glowing skin.', ingredients:['Volcanic Salt','Rose Hip Oil','Lemon Zest'], benefits:['Exfoliation','Brightening','Smooth Skin'] },
  { id:7, name:'Hibiscus Shine Oil', category:'Hair Care', sub:'High-Gloss Veil', price:12000, priceDisplay:'12,000 XAF', img:'https://lh3.googleusercontent.com/aida-public/AB6AXuD4_7KzQBpTgI_0QrfZS9gwk9MlifJY3rRB49Rjz1R1NgAjIs9vXbkY-N68aERth_kbe6-ahW1j5L5y1_8MTjKjka6ZDGAHRQ7Gs_b3QYIH9BfbDFdYG5_SPoQJrFnfDFjj6MliQrXLK_0iLBrFAyAZnj09lQrZ8_YE_ZsQkaV7_tScKvc8qs4ddCn9XfB7nW0HFsFaFUFaZcwHIQLSMmvp52fxnkWRDi8PirFFnd6lFXvAF9Ae7dgbCOCW2MrHymdoqTrO19NkpgE', desc:'Hibiscus-infused protective hair oil for mirror-like shine and heat protection.', ingredients:['Hibiscus Oil','Argan Essence','Keratin'], benefits:['High Shine','Heat Protection','Frizz-Free'] },
  { id:8, name:'Moonlight Restore Serum', category:'Skincare', sub:'Overnight Ritual', price:67500, priceDisplay:'67,500 XAF', badge:'Premium', img:'https://lh3.googleusercontent.com/aida-public/AB6AXuAy62CCXRDzziY4esr26eictpjg-fbI5K9lfjU4rGpueDeUSsXS_BFKYVA8AYBwkSJNTvAXpM2whk9L5aUkLpqNjVwELskwuVjQXIA9AanhkODEPrcUlOdB6y7sz56TH4eioMRB59Mv24jG2WMJH3Tu3x_HPT86HOY6pCjKL7-HZ8FLAXRGcYS7ICL237LDlMlGV4DoB9ZOluoEZdFOgD_WO15RiDb4PWZoSzkDo8_vX0bjJbb-bnKiuCvQ3deDVH35UnYSRuscInk', desc:'Intensive overnight repair serum that works while you sleep for a luminous morning glow.', ingredients:['Retinol Complex','Hyaluronic Acid','Midnight Jasmine'], benefits:['Overnight Repair','Anti-Aging','Morning Glow'] },
];

export const TESTIMONIALS = [
  { text: 'Claire Skiin has completely transformed my evening ritual. The textures feel like silk and the scent transports me to a peaceful sanctuary every time. My skin has never looked more vibrant.', author: 'Elena Rodriguez', role: 'Loyal Member Since 2021', stars: 5 },
  { text: 'Premium experience from the packaging to the product. It has a very subtle, earthy scent that I love. It\'s pricey, but a little goes a long way. Highly recommended for mature skin.', author: 'Marcus L.', role: 'Verified Purchase', stars: 4 },
  { text: 'The Moringa Elixir has completely transformed my scalp health. For the first time, my hair feels grounded and vibrant. It\'s more than a product; it\'s a sanctuary for my crown.', author: 'Aida M.', role: 'Loyal Member — Douala', stars: 5 },
];

export const CATEGORIES = ['All', 'Skincare', 'Lip Care', 'Hair Care', 'Spa Services'];

export const TICKER_ITEMS = [
  'Free Shipping on Orders Over 50,000 XAF',
  'Organic & Cruelty-Free',
  'Crafted in Cameroon',
  'Use Code GLOW15 for 15% Off',
  'New Collection Arriving Soon',
  '8,400+ Happy Clients',
  '100% Natural Ingredients',
];

export const CHAT_RESPONSES: Record<string, string> = {
  'dry skin': 'For dry skin, I recommend our Forest Glow Balm (62,000 XAF) — formulated with deep-hydrating Shea Butter. Also try the Radiance Elixir serum for a complete moisture ritual! 🌿',
  'best seller': 'Our top sellers right now are the Radiance Elixir (brightening serum) and the Volcanic Clay Mask. Both are loved by thousands of clients! ✨',
  'hair care': 'For your hair ritual, start with our Savanna Silk Oil for deep nourishment, and the Hibiscus Shine Oil for daily glossiness. Both are rooted in Cameroonian botanicals! 💚',
  'hair': 'For your hair ritual, start with our Savanna Silk Oil for deep nourishment, and the Hibiscus Shine Oil for daily glossiness. Both are rooted in Cameroonian botanicals! 💚',
  'spa': 'Our Spa Services range from the Radiance Glow Facial (35,000 XAF) to advanced treatments like Micro-Needling and LED Phototherapy. Would you like to book a session?',
  'lip': 'Our Cocoa Glaze Balm is a bestseller for deeply moisturized lips — with Cocoa Butter and Beeswax for a natural, plumping effect! 💄',
  'serum': 'Our Radiance Elixir and Moonlight Restore Serum are both exceptional. The Radiance Elixir brightens by day; the Moonlight Serum repairs overnight. Many clients use both! ✨',
  'default': 'I\'m here to guide your skin journey! Ask me about skin concerns, product recommendations, or spa services. What does your skin need today? 🌿',
};
