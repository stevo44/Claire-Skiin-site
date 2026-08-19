import React from 'react';
import { motion } from 'motion/react';
import { UserPlus } from 'lucide-react';
import { eventService } from '../services/eventService.ts';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
}

interface ProductCardProps {
  product: Product;
  onAddToCart: (productId: number) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  const handleView = () => {
    eventService.trackProductView(product.id, { name: product.name });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      onClick={handleView}
      className="group p-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl hover:bg-white/10 transition-all cursor-pointer"
    >
      <div className="aspect-video mb-6 rounded-2xl overflow-hidden bg-white/5">
        <img
          src={product.image_url}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
      </div>
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-bold text-lg">{product.name}</h4>
        <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-[10px] font-bold uppercase tracking-wider rounded-md">
          {product.category}
        </span>
      </div>
      <p className="text-sm text-white/40 mb-6 line-clamp-2">{product.description}</p>
      <div className="flex items-center justify-between mt-6">
        <span className="text-xl font-bold text-green-400">${product.price}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart(product.id);
          }}
          className="p-2 bg-purple-500/20 hover:bg-purple-500/40 text-purple-400 rounded-xl transition-colors"
        >
          <UserPlus className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
};
