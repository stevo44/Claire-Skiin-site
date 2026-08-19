import React from 'react';
import { motion } from 'motion/react';
import { AlertCircle } from 'lucide-react';

interface CartItemProps {
  item: any;
  onUpdateQuantity: (cartItemId: number, newQuantity: number) => void;
  onRemove: (cartItemId: number) => void;
}

export const CartItem: React.FC<CartItemProps> = ({ item, onUpdateQuantity, onRemove }) => {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-6 p-4 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl"
    >
      <img 
        src={item.image_url} 
        alt={item.name}
        className="w-16 h-16 object-cover rounded-xl"
        referrerPolicy="no-referrer"
      />
      <div className="flex-1">
        <h4 className="font-bold">{item.name}</h4>
        <p className="text-xs text-white/40">{item.category}</p>
      </div>
      <div className="flex items-center gap-3">
        <button 
          onClick={() => onUpdateQuantity(item.cart_item_id, item.quantity - 1)}
          className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
        >
          -
        </button>
        <span className="w-8 text-center font-mono">{item.quantity}</span>
        <button 
          onClick={() => onUpdateQuantity(item.cart_item_id, item.quantity + 1)}
          className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
        >
          +
        </button>
      </div>
      <div className="w-24 text-right">
        <span className="font-bold text-green-400">${item.subtotal}</span>
      </div>
      <button 
        onClick={() => onRemove(item.cart_item_id)}
        className="p-2 text-red-400 hover:bg-red-400/10 rounded-xl transition-colors"
      >
        <AlertCircle className="w-5 h-5" />
      </button>
    </motion.div>
  );
};
