import React from 'react';
import { motion } from 'motion/react';
import { Activity, Database, CheckCircle2, AlertCircle } from 'lucide-react';

interface StatusCardProps {
  type: 'api' | 'database';
  status: string;
  loading: boolean;
  health: any;
  onCheck: () => void;
}

export const StatusCard: React.FC<StatusCardProps> = ({ type, status, loading, health, onCheck }) => {
  const isApi = type === 'api';
  const Icon = isApi ? Activity : Database;
  const colorClass = isApi ? 'text-blue-400' : 'text-purple-400';
  const title = isApi ? 'API Gateway' : 'PostgreSQL';
  const subtitle = isApi ? 'Express.js Server' : 'Supabase Instance';
  const endpoint = isApi ? '/api/health' : 'node-pg';
  const label = isApi ? 'Endpoint' : 'Driver';

  const isHealthy = isApi 
    ? health?.status === 'success' 
    : health?.database === 'connected';

  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      className="p-8 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl"
    >
      <div className="flex justify-between items-start mb-6">
        <Icon className={`w-8 h-8 ${colorClass}`} />
        {loading ? (
          <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
        ) : isHealthy ? (
          <CheckCircle2 className="w-6 h-6 text-green-500" />
        ) : (
          <AlertCircle className="w-6 h-6 text-red-500" />
        )}
      </div>
      <h3 className="text-2xl font-semibold mb-2">{title}</h3>
      <p className="text-white/40 text-sm font-mono uppercase tracking-wider mb-4">{subtitle}</p>
      <div className="space-y-2 mb-6">
        <div className="flex justify-between text-sm">
          <span className="text-white/40">Status</span>
          <span className={isHealthy ? 'text-green-400' : 'text-red-400'}>
            {loading ? 'Checking...' : (isHealthy ? (isApi ? 'Online' : 'Connected') : 'Offline')}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-white/40">{label}</span>
          <span className="font-mono">{endpoint}</span>
        </div>
      </div>
      <button 
        onClick={onCheck}
        disabled={loading}
        className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
      >
        {loading ? 'Checking...' : (isApi ? 'Check Status' : 'Check Connection')}
      </button>
    </motion.div>
  );
};
