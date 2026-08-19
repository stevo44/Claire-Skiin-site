export interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
  category: string;
  isNew?: boolean;
}

export const mockProducts: Product[] = [
  {
    id: 1,
    name: "Radiant Vitamin C Serum",
    price: 45000,
    image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=800",
    category: "Serums",
    isNew: true,
  },
  {
    id: 2,
    name: "Hydrating Rose Water Toner",
    price: 25000,
    image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&q=80&w=800",
    category: "Toners",
  },
  {
    id: 3,
    name: "Nourishing Night Cream",
    price: 55000,
    image: "https://images.unsplash.com/photo-1615397323758-c0b9ae32eb39?auto=format&fit=crop&q=80&w=800",
    category: "Moisturizers",
  },
  {
    id: 4,
    name: "Gentle Exfoliating Scrub",
    price: 32000,
    image: "https://images.unsplash.com/photo-1556228720-192b61f89bc7?auto=format&fit=crop&q=80&w=800",
    category: "Cleansers",
  },
  {
    id: 5,
    name: "Purifying Clay Mask",
    price: 40000,
    image: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&q=80&w=800",
    category: "Masks",
  },
];

export const siteContent = {
  hero: {
    title: "Embrace Your Natural Glow",
    subtitle: "Luxurious, effective skincare crafted for your unique beauty.",
    cta: "Shop the Collection"
  },
  story: {
    headline: "Our Philosophy",
    body: "We believe in the power of nature combined with science to create skincare that truly works."
  }
};
