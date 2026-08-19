import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Users, ShoppingBag, DollarSign, Package, Clock, AlertCircle, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { adminService } from '../services/adminService.ts';
import { useSocket } from '../hooks/useSocket.ts';

export const AdminDashboard: React.FC = () => {
  const [kpis, setKpis] = useState<any>(null);
  const [revenueTrends, setRevenueTrends] = useState<any[]>([]);
  const [mostViewed, setMostViewed] = useState<any[]>([]);
  const [conversionRate, setConversionRate] = useState<any>(null);
  const [abandonmentRate, setAbandonmentRate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [kpiData, trends, viewed, conv, aband] = await Promise.all([
        adminService.getDashboardKPIs(),
        adminService.getRevenueTrends(),
        adminService.getMostViewedProducts(),
        adminService.getConversionRate(),
        adminService.getCartAbandonmentRate()
      ]);
      setKpis(kpiData);
      setRevenueTrends(trends);
      setMostViewed(viewed);
      setConversionRate(conv);
      setAbandonmentRate(aband);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('new_order', (data) => {
        console.log('Real-time: New order received!', data);
        // Optimistically update KPIs or just refetch
        fetchData();
      });

      return () => {
        socket.off('new_order');
      };
    }
  }, [socket]);

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/40">Loading Admin Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2">Admin Dashboard</h2>
          <p className="text-white/40">Real-time business performance metrics</p>
        </div>
        <button 
          onClick={fetchData}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold transition-colors"
        >
          Refresh Data
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <KPICard 
          title="Total Sales" 
          value={`$${(kpis?.totalSales || 0).toLocaleString()}`} 
          icon={<DollarSign className="w-5 h-5 text-green-400" />} 
          color="green"
        />
        <KPICard 
          title="Total Orders" 
          value={kpis?.totalOrders || 0} 
          icon={<ShoppingBag className="w-5 h-5 text-blue-400" />} 
          color="blue"
        />
        <KPICard 
          title="Total Users" 
          value={kpis?.totalUsers || 0} 
          icon={<Users className="w-5 h-5 text-purple-400" />} 
          color="purple"
        />
        <KPICard 
          title="Avg Order Value" 
          value={`$${((kpis?.totalSales || 0) / (kpis?.totalOrders || 1)).toFixed(2)}`} 
          icon={<TrendingUp className="w-5 h-5 text-orange-400" />} 
          color="orange"
        />
        <KPICard 
          title="Conversion Rate" 
          value={`${parseFloat(conversionRate?.conversion_rate || 0).toFixed(2)}%`} 
          icon={<Activity className="w-5 h-5 text-purple-400" />} 
          color="purple"
        />
        <KPICard 
          title="Abandonment Rate" 
          value={`${parseFloat(abandonmentRate?.abandonment_rate || 0).toFixed(2)}%`} 
          icon={<AlertCircle className="w-5 h-5 text-red-400" />} 
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue Trends Chart */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-400" /> Revenue Trends (Last 7 Days)
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="date" stroke="#ffffff40" fontSize={12} />
                <YAxis stroke="#ffffff40" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #ffffff20', borderRadius: '12px' }}
                  itemStyle={{ color: '#a855f7' }}
                />
                <Line type="monotone" dataKey="revenue" stroke="#a855f7" strokeWidth={3} dot={{ fill: '#a855f7' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Most Viewed Products */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" /> Most Viewed Products
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mostViewed}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="product_name" stroke="#ffffff40" fontSize={10} />
                <YAxis stroke="#ffffff40" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #ffffff20', borderRadius: '12px' }}
                  itemStyle={{ color: '#3b82f6' }}
                />
                <Bar dataKey="views" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Orders */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-400" /> Recent Orders
          </h3>
          <div className="space-y-4">
            {kpis?.recentOrders?.map((order: any) => (
              <div key={order.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                <div>
                  <p className="text-sm font-bold">{order.user_name}</p>
                  <p className="text-[10px] text-white/40">{new Date(order.created_at).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-green-400">${parseFloat(order.total_amount).toFixed(2)}</p>
                  <p className={`text-[10px] uppercase tracking-wider ${order.status === 'completed' ? 'text-blue-400' : 'text-orange-400'}`}>{order.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Package className="w-5 h-5 text-green-400" /> Top Selling Products
          </h3>
          <div className="space-y-4">
            {kpis?.topProducts?.map((product: any) => (
              <div key={product.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                <div>
                  <p className="text-sm font-bold">{product.name}</p>
                  <p className="text-[10px] text-white/40">{product.total_sold} units sold</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-purple-400">${parseFloat(product.revenue).toFixed(2)}</p>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider">Revenue</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const KPICard: React.FC<{ title: string, value: any, icon: React.ReactNode, color: string }> = ({ title, value, icon, color }) => {
  const colorClasses: any = {
    green: 'bg-green-500/10 border-green-500/20 text-green-400',
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
    orange: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
    red: 'bg-red-500/10 border-red-500/20 text-red-400'
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-6 rounded-3xl border ${colorClasses[color]}`}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-mono uppercase tracking-widest opacity-60">{title}</p>
        <div className="p-2 bg-white/5 rounded-lg">{icon}</div>
      </div>
      <p className="text-3xl font-bold tracking-tighter">{value}</p>
    </motion.div>
  );
};
