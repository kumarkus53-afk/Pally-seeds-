/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Sprout, 
  ShoppingCart, 
  User, 
  LayoutDashboard, 
  BookOpen, 
  PhoneCall, 
  MessageSquare, 
  Package, 
  TrendingUp, 
  Users, 
  Settings,
  Plus,
  Search,
  ChevronRight,
  MapPin,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  Menu,
  X,
  Languages,
  ThermometerSun,
  FlaskConical
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

// --- Types ---
type Role = 'farmer' | 'dealer' | 'admin';

interface Product {
  id: number;
  name: string;
  category: string;
  description: string;
  price_retail: number;
  price_dealer: number;
  min_dealer_qty: number;
  stock: number;
  image_url: string;
}

interface UserData {
  id: number;
  phone: string;
  name: string;
  role: Role;
  location: string;
  kyc_status: string;
  credit_limit: number;
  used_credit: number;
}

interface Order {
  id: number;
  total_amount: number;
  status: string;
  created_at: string;
  items_summary: string;
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// --- Components ---

const Navbar = ({ role, setRole, user, onLogout }: { role: Role, setRole: (r: Role) => void, user: UserData | null, onLogout: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-white border-b border-stone-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-600 p-2 rounded-lg">
              <Sprout className="text-white w-6 h-6" />
            </div>
            <span className="text-xl font-bold text-emerald-800 tracking-tight">Pally Seeds</span>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <select 
              value={role} 
              onChange={(e) => setRole(e.target.value as Role)}
              className="text-sm border-none bg-stone-100 rounded-full px-4 py-1.5 font-medium text-stone-600 focus:ring-2 focus:ring-emerald-500 transition-all"
            >
              <option value="farmer">Farmer Mode</option>
              <option value="dealer">Dealer Mode</option>
              {user?.role === 'admin' && <option value="admin">Admin Panel</option>}
            </select>
            {user && (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-semibold">{user.name}</p>
                  <p className="text-xs text-stone-500 capitalize">{user.role}</p>
                </div>
                <button onClick={onLogout} className="p-2 hover:bg-stone-100 rounded-full text-stone-400 hover:text-red-500 transition-colors">
                  <User className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          <div className="md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="p-2">
              {isOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

const FarmerDashboard = ({ products, user }: { products: Product[], user: UserData }) => {
  const [cart, setCart] = useState<{product: Product, qty: number}[]>([]);
  const [view, setView] = useState<'catalog' | 'orders' | 'edu' | 'soil'>('catalog');
  const [orders, setOrders] = useState<Order[]>([]);
  const [soilReport, setSoilReport] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) fetchOrders();
  }, [user]);

  const fetchOrders = async () => {
    const res = await fetch(`/api/orders/${user.id}`);
    const data = await res.json();
    setOrders(data);
  };

  const addToCart = (p: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === p.id);
      if (existing) return prev.map(item => item.product.id === p.id ? { ...item, qty: item.qty + 1 } : item);
      return [...prev, { product: p, qty: 1 }];
    });
  };

  const placeOrder = async () => {
    const total = cart.reduce((sum, item) => sum + (item.product.price_retail * item.qty), 0);
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        items: cart.map(i => ({ id: i.product.id, quantity: i.qty, price: i.product.price_retail })),
        totalAmount: total
      })
    });
    if (res.ok) {
      alert("Order placed successfully!");
      setCart([]);
      fetchOrders();
    }
  };

  const analyzeSoil = async () => {
    if (!soilReport) return;
    setLoading(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `As an agricultural expert for Pally Seeds, analyze this soil report and suggest the best seeds from our catalog (Rabi, Kharif, Vegetables). Report: ${soilReport}`,
      });
      setAiSuggestion(response.text || "Could not generate suggestion.");
    } catch (e) {
      setAiSuggestion("Error analyzing soil. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-wrap gap-4 mb-8">
        {[
          { id: 'catalog', label: 'Seed Catalog', icon: ShoppingCart },
          { id: 'soil', label: 'Soil Testing', icon: FlaskConical },
          { id: 'edu', label: 'Education Hub', icon: BookOpen },
          { id: 'orders', label: 'My Orders', icon: Package },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold transition-all ${
              view === tab.id 
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' 
                : 'bg-white text-stone-600 hover:bg-emerald-50'
            }`}
          >
            <tab.icon className="w-5 h-5" />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {view === 'catalog' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6"
          >
            {products.map(p => (
              <div key={p.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-stone-100 hover:shadow-xl transition-all group">
                <div className="relative h-48 overflow-hidden">
                  <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-emerald-700 uppercase tracking-wider">
                    {p.category}
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold text-stone-800 mb-1">{p.name}</h3>
                  <p className="text-sm text-stone-500 line-clamp-2 mb-4">{p.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-black text-emerald-600">₹{p.price_retail}</span>
                    <button 
                      onClick={() => addToCart(p)}
                      className="bg-emerald-600 text-white p-2.5 rounded-xl hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-100"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {view === 'soil' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-3xl p-8 shadow-sm border border-stone-100 max-w-2xl mx-auto"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-amber-100 p-3 rounded-2xl">
                <FlaskConical className="text-amber-600 w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-stone-800">AI Soil Analysis</h2>
                <p className="text-stone-500">Upload your soil report details for expert seed suggestions.</p>
              </div>
            </div>
            <textarea
              value={soilReport}
              onChange={(e) => setSoilReport(e.target.value)}
              placeholder="Enter your soil NPK values, pH level, or paste report text here..."
              className="w-full h-40 p-4 rounded-2xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent mb-6 resize-none"
            />
            <button
              onClick={analyzeSoil}
              disabled={loading || !soilReport}
              className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-lg shadow-emerald-100"
            >
              {loading ? "Analyzing..." : "Get AI Suggestion"}
            </button>
            {aiSuggestion && (
              <div className="mt-8 p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                <h4 className="font-bold text-emerald-800 mb-2 flex items-center gap-2">
                  <Sprout className="w-5 h-5" /> Pally AI Suggestion
                </h4>
                <p className="text-emerald-900 leading-relaxed whitespace-pre-wrap">{aiSuggestion}</p>
              </div>
            )}
          </motion.div>
        )}

        {view === 'orders' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {orders.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-stone-300">
                <Package className="w-16 h-16 text-stone-300 mx-auto mb-4" />
                <p className="text-stone-500 font-medium">No orders yet. Start shopping!</p>
              </div>
            ) : (
              orders.map(order => (
                <div key={order.id} className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-bold text-lg text-stone-800">Order #{order.id}</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        order.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    <p className="text-sm text-stone-500 mb-2">{new Date(order.created_at).toLocaleDateString()}</p>
                    <p className="text-stone-600 font-medium">{order.items_summary}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-emerald-600">₹{order.total_amount}</p>
                    <button className="text-emerald-600 text-sm font-bold hover:underline mt-2">Track Order</button>
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}

        {view === 'edu' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-100">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <ThermometerSun className="text-amber-500" /> Weather Updates
              </h3>
              <div className="flex items-center justify-between p-6 bg-stone-50 rounded-2xl">
                <div>
                  <p className="text-4xl font-black text-stone-800">32°C</p>
                  <p className="text-stone-500 font-medium">Sunny • New Delhi</p>
                </div>
                <ThermometerSun className="w-12 h-12 text-amber-400" />
              </div>
              <p className="mt-4 text-sm text-stone-500 italic">"Best time for sowing Rabi crops in the next 3 days."</p>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-100">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <BookOpen className="text-emerald-500" /> Sowing Guides
              </h3>
              <div className="space-y-4">
                {['Wheat Sowing Techniques', 'Organic Pest Control', 'Water Management'].map(guide => (
                  <div key={guide} className="flex items-center justify-between p-4 hover:bg-stone-50 rounded-xl cursor-pointer transition-colors group">
                    <span className="font-medium text-stone-700 group-hover:text-emerald-600">{guide}</span>
                    <ChevronRight className="w-5 h-5 text-stone-300 group-hover:text-emerald-600" />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart Overlay */}
      {cart.length > 0 && (
        <motion.div 
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-40"
        >
          <div className="bg-stone-900 text-white p-6 rounded-3xl shadow-2xl flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">{cart.length} Items Selected</p>
              <p className="text-2xl font-black">₹{cart.reduce((sum, i) => sum + (i.product.price_retail * i.qty), 0)}</p>
            </div>
            <button 
              onClick={placeOrder}
              className="bg-emerald-500 text-white px-8 py-3 rounded-2xl font-bold hover:bg-emerald-400 transition-colors"
            >
              Checkout
            </button>
          </div>
        </motion.div>
      )}

      {/* Support FAB */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-4 z-40">
        <button className="bg-emerald-500 text-white p-4 rounded-full shadow-lg hover:scale-110 transition-transform">
          <MessageSquare className="w-6 h-6" />
        </button>
        <button className="bg-stone-800 text-white p-4 rounded-full shadow-lg hover:scale-110 transition-transform">
          <PhoneCall className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

const DealerDashboard = ({ products, user }: { products: Product[], user: UserData }) => {
  const [view, setView] = useState<'bulk' | 'inventory' | 'credit'>('bulk');

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100">
          <p className="text-stone-500 text-sm font-bold uppercase tracking-wider mb-2">Credit Limit</p>
          <p className="text-3xl font-black text-stone-800">₹{user.credit_limit.toLocaleString()}</p>
          <div className="mt-4 h-2 bg-stone-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500" 
              style={{ width: `${(user.used_credit / user.credit_limit) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-stone-400 font-medium">Used: ₹{user.used_credit.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100">
          <p className="text-stone-500 text-sm font-bold uppercase tracking-wider mb-2">KYC Status</p>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="text-emerald-500 w-6 h-6" />
            <p className="text-2xl font-black text-stone-800 uppercase">{user.kyc_status}</p>
          </div>
          <p className="mt-4 text-xs text-stone-400 font-medium">Verified on 12 Feb 2026</p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100">
          <p className="text-stone-500 text-sm font-bold uppercase tracking-wider mb-2">Active Leads</p>
          <p className="text-3xl font-black text-emerald-600">12</p>
          <p className="mt-4 text-xs text-stone-400 font-medium">Farmers in your district</p>
        </div>
      </div>

      <div className="flex gap-4 mb-8">
        <button onClick={() => setView('bulk')} className={`px-6 py-2 rounded-full font-bold transition-all ${view === 'bulk' ? 'bg-stone-900 text-white' : 'bg-white text-stone-600'}`}>Wholesale Catalog</button>
        <button onClick={() => setView('inventory')} className={`px-6 py-2 rounded-full font-bold transition-all ${view === 'inventory' ? 'bg-stone-900 text-white' : 'bg-white text-stone-600'}`}>My Inventory</button>
      </div>

      {view === 'bulk' && (
        <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-stone-100">
          <table className="w-full text-left">
            <thead className="bg-stone-50 border-b border-stone-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest">Product</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest">Retail Price</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest">Wholesale Price</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest">Min Qty</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={p.image_url} className="w-10 h-10 rounded-lg object-cover" referrerPolicy="no-referrer" />
                      <span className="font-bold text-stone-800">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-stone-500 line-through">₹{p.price_retail}</td>
                  <td className="px-6 py-4 text-emerald-600 font-black">₹{p.price_dealer}</td>
                  <td className="px-6 py-4 text-stone-600 font-medium">{p.min_dealer_qty} units</td>
                  <td className="px-6 py-4">
                    <button className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors">Bulk Order</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const AdminDashboard = () => {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch('/api/admin/stats').then(res => res.json()).then(setStats);
  }, []);

  if (!stats) return <div className="p-20 text-center">Loading Analytics...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        {[
          { label: 'Total Sales', value: `₹${stats.totalSales.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-600' },
          { label: 'Total Orders', value: stats.orderCount, icon: ShoppingCart, color: 'text-amber-600' },
          { label: 'Active Users', value: stats.userCount, icon: Users, color: 'text-blue-600' },
          { label: 'KYC Pending', value: '4', icon: AlertCircle, color: 'text-red-600' },
        ].map(card => (
          <div key={card.label} className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100">
            <div className={`p-3 rounded-2xl bg-stone-50 w-fit mb-4 ${card.color}`}>
              <card.icon className="w-6 h-6" />
            </div>
            <p className="text-stone-500 text-sm font-bold uppercase tracking-wider">{card.label}</p>
            <p className="text-2xl font-black text-stone-800 mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-100">
          <h3 className="text-xl font-bold mb-6">Top Selling Seeds</h3>
          <div className="space-y-6">
            {stats.topProducts.map((p: any, idx: number) => (
              <div key={p.name} className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-stone-300 font-black text-2xl">0{idx + 1}</span>
                  <span className="font-bold text-stone-800">{p.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-32 h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${(p.total_sold / stats.topProducts[0].total_sold) * 100}%` }} />
                  </div>
                  <span className="text-stone-500 font-bold text-sm">{p.total_sold} units</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-100">
          <h3 className="text-xl font-bold mb-6">Recent Activity</h3>
          <div className="space-y-4">
            {[
              { user: 'Rahul Kumar', action: 'placed bulk order', time: '2 mins ago' },
              { user: 'Suresh Singh', action: 'uploaded KYC', time: '15 mins ago' },
              { user: 'Amit Patel', action: 'registered as Farmer', time: '1 hour ago' },
            ].map((activity, i) => (
              <div key={i} className="flex items-center gap-4 p-4 hover:bg-stone-50 rounded-2xl transition-colors">
                <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center font-bold text-stone-400">
                  {activity.user[0]}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-stone-800">{activity.user} <span className="font-medium text-stone-500">{activity.action}</span></p>
                  <p className="text-xs text-stone-400">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const Auth = ({ onLogin }: { onLogin: (user: UserData) => void }) => {
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('farmer');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isAdminLogin, setIsAdminLogin] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdminLogin) {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) onLogin(data);
      else alert(data.error);
    } else if (isRegistering) {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, name, role, location: 'New Delhi' })
      });
      const data = await res.json();
      if (res.ok) onLogin(data);
      else alert(data.error);
    } else {
      const res = await fetch(`/api/user/${phone}`);
      const data = await res.json();
      if (data) onLogin(data);
      else setIsRegistering(true);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-stone-50">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-stone-100 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="bg-emerald-100 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <Sprout className="text-emerald-600 w-8 h-8" />
          </div>
          <h2 className="text-3xl font-black text-stone-800 tracking-tight">
            {isAdminLogin ? 'Admin Portal' : 'Welcome to Pally'}
          </h2>
          <p className="text-stone-500 mt-2 font-medium">
            {isAdminLogin ? 'Login with your admin credentials.' : 'Your digital partner for premium seeds.'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {isAdminLogin ? (
            <>
              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 ml-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@pallyseeds.com"
                  className="w-full px-5 py-4 rounded-2xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all font-medium"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 ml-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-5 py-4 rounded-2xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all font-medium"
                  required
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 ml-1">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter 10 digit mobile number"
                  className="w-full px-5 py-4 rounded-2xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all font-medium"
                  required
                />
              </div>

              {isRegistering && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 ml-1">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your name"
                      className="w-full px-5 py-4 rounded-2xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all font-medium"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 ml-1">I am a</label>
                    <div className="grid grid-cols-2 gap-3">
                      {['farmer', 'dealer'].map(r => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRole(r as Role)}
                          className={`py-3 rounded-xl font-bold capitalize border-2 transition-all ${
                            role === r ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-stone-100 text-stone-400'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </>
          )}

          <button
            type="submit"
            className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 mt-4"
          >
            {isAdminLogin ? 'Login as Admin' : (isRegistering ? 'Create Account' : 'Login with OTP')}
          </button>
        </form>

        <div className="mt-8 space-y-4">
          <p className="text-center text-stone-400 text-sm font-medium">
            {!isAdminLogin && (
              <>
                {isRegistering ? 'Already have an account?' : 'New to Pally Seeds?'} 
                <button 
                  onClick={() => setIsRegistering(!isRegistering)}
                  className="text-emerald-600 font-bold ml-1 hover:underline"
                >
                  {isRegistering ? 'Login' : 'Register'}
                </button>
              </>
            )}
          </p>
          
          <div className="pt-4 border-t border-stone-100">
            <button 
              onClick={() => {
                setIsAdminLogin(!isAdminLogin);
                setIsRegistering(false);
              }}
              className="w-full text-stone-400 hover:text-stone-600 text-sm font-bold transition-colors"
            >
              {isAdminLogin ? 'Back to User Login' : 'Admin Login'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default function App() {
  const [role, setRole] = useState<Role>('farmer');
  const [user, setUser] = useState<UserData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetch('/api/products').then(res => res.json()).then(setProducts);
  }, []);

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <div className="min-h-screen bg-stone-50 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      <Navbar role={role} setRole={setRole} user={user} onLogout={handleLogout} />
      
      {!user ? (
        <Auth onLogin={(u) => {
          setUser(u);
          setRole(u.role === 'admin' ? 'admin' : u.role);
        }} />
      ) : (
        <main>
          {role === 'farmer' && <FarmerDashboard products={products} user={user} />}
          {role === 'dealer' && <DealerDashboard products={products} user={user} />}
          {role === 'admin' && user.role === 'admin' && <AdminDashboard />}
        </main>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-stone-200 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sprout className="text-emerald-600 w-5 h-5" />
            <span className="font-bold text-stone-800">Pally Seeds</span>
          </div>
          <p className="text-stone-400 text-sm font-medium">© 2026 Pally Seeds Agri-Tech. Empowering Farmers, Enriching Soil.</p>
          <div className="flex justify-center gap-6 mt-6">
            <button className="text-stone-400 hover:text-emerald-600 transition-colors"><Languages className="w-5 h-5" /></button>
            <button className="text-stone-400 hover:text-emerald-600 transition-colors text-sm font-bold">Privacy</button>
            <button className="text-stone-400 hover:text-emerald-600 transition-colors text-sm font-bold">Terms</button>
          </div>
        </div>
      </footer>
    </div>
  );
}

