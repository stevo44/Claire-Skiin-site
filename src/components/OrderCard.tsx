import React from 'react';
import { motion } from 'motion/react';

interface OrderCardProps {
  order: any;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="p-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Order ID: #{order.id}</p>
          <p className="text-sm font-medium">{new Date(order.created_at).toLocaleDateString()}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Total Amount</p>
          <p className="text-xl font-bold text-green-400">${order.total_amount}</p>
        </div>
      </div>
      <div className="border-t border-white/10 pt-4">
        <div className="space-y-2">
          {order.items.map((item: any, idx: number) => (
            <div key={idx} className="flex justify-between text-sm">
              <span className="text-white/60">{item.name} x {item.quantity}</span>
              <span className="font-mono">${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};
