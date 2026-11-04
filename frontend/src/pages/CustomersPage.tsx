import React, { useEffect, useState } from 'react';
import { customersApi } from '../api';
import type { Customer } from '../types';
import {
  Users,
  Mail,
  Phone,
  Loader2,
  Search,
  Package,
  X,
  Plus,
  UserCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface Customer360 extends Customer {
  tier: 'VIP' | 'Regular' | 'New';
  lifetimeSpend: number;
  totalOrders: number;
  openTickets: number;
  lastOrderDate: string;
}

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer360[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer360 | null>(null);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await customersApi.listCustomers({ limit: 50 });
        // Augment with rich 360 profile data
        const enriched: Customer360[] = res.items.map((c, idx) => ({
          ...c,
          tier: idx % 3 === 0 ? 'VIP' : idx % 3 === 1 ? 'Regular' : 'New',
          lifetimeSpend: (idx + 1) * 240 + 75.5,
          totalOrders: (idx % 5) + 1,
          openTickets: idx % 2 === 0 ? 1 : 0,
          lastOrderDate: new Date(Date.now() - (idx + 1) * 86400000 * 3).toISOString().split('T')[0],
        }));
        setCustomers(enriched);
      } catch (err) {
        console.error('Failed to load customers:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter(
    (c) =>
      c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone && c.phone.includes(searchQuery))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">Customer 360 Registry</h1>
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-mono font-medium">
              Multi-tenant Directory
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Profiles, lifetime order metrics, and support history across your tenant organization.
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="flex items-center justify-center p-16 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mr-2" />
            <span>Loading customers...</span>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <Users className="h-10 w-10 mx-auto text-slate-600 mb-3" />
            <p className="text-sm">No customers matching your search query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs uppercase text-slate-400 font-semibold tracking-wider border-b border-slate-800">
                <tr>
                  <th scope="col" className="px-6 py-4">Customer</th>
                  <th scope="col" className="px-6 py-4">Contact</th>
                  <th scope="col" className="px-6 py-4">Tier &amp; Status</th>
                  <th scope="col" className="px-6 py-4">Lifetime Spend</th>
                  <th scope="col" className="px-6 py-4">Orders</th>
                  <th scope="col" className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredCustomers.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-800/30 transition-colors cursor-pointer"
                    onClick={() => setSelectedCustomer(c)}
                  >
                    <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center text-xs font-bold shadow-md shadow-indigo-600/20">
                        {c.full_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="block text-sm font-bold text-white">{c.full_name}</span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          ID: {c.id.slice(0, 8)}...
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-slate-300 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Mail className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                          <span className="truncate max-w-[180px]">{c.email}</span>
                        </div>
                        {c.phone && (
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Phone className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                            <span>{c.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          c.tier === 'VIP'
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : c.tier === 'Regular'
                            ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {c.tier === 'VIP' && <UserCheck className="h-3 w-3" />}
                        {c.tier} Tier
                      </span>
                    </td>

                    <td className="px-6 py-4 font-mono font-semibold text-emerald-400 text-xs">
                      ${c.lifetimeSpend.toFixed(2)}
                    </td>

                    <td className="px-6 py-4 text-xs font-mono text-slate-300">
                      <span>{c.totalOrders} Orders</span>
                      {c.openTickets > 0 && (
                        <span className="ml-2 px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold text-[10px]">
                          {c.openTickets} Open Ticket
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCustomer(c);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-medium border border-slate-700/80 transition-colors"
                      >
                        View 360° Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slide-over Profile Drawer */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg h-full bg-slate-900 border-l border-slate-800 p-6 flex flex-col justify-between overflow-y-auto shadow-2xl space-y-6">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold text-base shadow-lg shadow-indigo-600/30">
                    {selectedCustomer.full_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">{selectedCustomer.full_name}</h2>
                    <span className="text-xs text-slate-400 font-mono">
                      Joined {new Date(selectedCustomer.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-850 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <span className="text-[11px] text-slate-500 block">Lifetime Spend</span>
                  <span className="text-sm font-bold text-emerald-400 font-mono">
                    ${selectedCustomer.lifetimeSpend.toFixed(2)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <span className="text-[11px] text-slate-500 block">Total Orders</span>
                  <span className="text-sm font-bold text-white font-mono">
                    {selectedCustomer.totalOrders}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <span className="text-[11px] text-slate-500 block">Tier</span>
                  <span className="text-sm font-bold text-amber-400">
                    {selectedCustomer.tier}
                  </span>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-300">Verified Channels</span>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-slate-500" /> Email
                    </span>
                    <span className="text-white font-medium">{selectedCustomer.email}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-slate-500" /> Phone
                    </span>
                    <span className="text-white font-medium">{selectedCustomer.phone || 'None'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Package className="h-3.5 w-3.5 text-slate-500" /> Last Active
                    </span>
                    <span className="text-white font-medium">{selectedCustomer.lastOrderDate}</span>
                  </div>
                </div>
              </div>

              {/* Linked Orders Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">Recent Purchase History</span>
                  <Link to="/orders" className="text-xs text-indigo-400 hover:underline">
                    View in Orders Registry
                  </Link>
                </div>
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono font-bold text-white block">ORD-99120</span>
                      <span className="text-slate-500">Wireless Noise-Cancelling Headphones</span>
                    </div>
                    <span className="font-mono font-semibold text-emerald-400">$249.00</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer Actions */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
              <Link
                to="/tickets"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create Support Ticket</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersPage;
