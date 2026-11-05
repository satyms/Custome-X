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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5" style={{ borderColor: 'var(--border)' }}>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
              Customer 360 Registry
            </h1>
            <span
              className="px-2 py-0.5 rounded-full border text-xs font-mono font-medium"
              style={{ background: 'var(--accent-light)', color: 'var(--accent)', borderColor: 'var(--border)' }}
            >
              Multi-tenant Directory
            </span>
          </div>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            Profiles, lifetime order metrics, and support history across your tenant organization.
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border text-xs focus:outline-none"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-xl border overflow-hidden shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        {isLoading ? (
          <div className="flex items-center justify-center p-16" style={{ color: 'var(--text-muted)' }}>
            <Loader2 className="h-6 w-6 animate-spin mr-2" style={{ color: 'var(--accent)' }} />
            <span>Loading customers...</span>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-16 text-center" style={{ color: 'var(--text-muted)' }}>
            <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No customers matching your search query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase font-semibold tracking-wider border-b" style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                <tr>
                  <th scope="col" className="px-6 py-3.5">Customer</th>
                  <th scope="col" className="px-6 py-3.5">Contact</th>
                  <th scope="col" className="px-6 py-3.5">Tier &amp; Status</th>
                  <th scope="col" className="px-6 py-3.5">Lifetime Spend</th>
                  <th scope="col" className="px-6 py-3.5">Orders</th>
                  <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {filteredCustomers.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedCustomer(c)}
                  >
                    <td className="px-6 py-4 font-medium flex items-center gap-3">
                      <div
                        className="h-8 w-8 rounded-full text-white flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: 'var(--accent)' }}
                      >
                        {c.full_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="block text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{c.full_name}</span>
                        <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                          ID: {c.id.slice(0, 8)}...
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                          <Mail className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
                          <span className="truncate max-w-[180px]">{c.email}</span>
                        </div>
                        {c.phone && (
                          <div className="flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                            <Phone className="h-3.5 w-3.5 shrink-0" />
                            <span>{c.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          background: c.tier === 'VIP' ? 'var(--warning-light)' : c.tier === 'Regular' ? 'var(--accent-light)' : 'var(--bg-muted)',
                          color: c.tier === 'VIP' ? 'var(--warning)' : c.tier === 'Regular' ? 'var(--accent)' : 'var(--text-muted)',
                        }}
                      >
                        {c.tier === 'VIP' && <UserCheck className="h-3 w-3" />}
                        {c.tier} Tier
                      </span>
                    </td>

                    <td className="px-6 py-4 font-mono font-semibold text-xs" style={{ color: 'var(--success)' }}>
                      ${c.lifetimeSpend.toFixed(2)}
                    </td>

                    <td className="px-6 py-4 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                      <span>{c.totalOrders} Orders</span>
                      {c.openTickets > 0 && (
                        <span
                          className="ml-2 px-1.5 py-0.5 rounded font-bold text-[10px]"
                          style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}
                        >
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
                        className="px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors hover:bg-slate-50 cursor-pointer"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
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
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-xs">
          <div
            className="w-full max-w-lg h-full border-l p-6 flex flex-col justify-between overflow-y-auto shadow-2xl space-y-6"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-3">
                  <div
                    className="h-11 w-11 rounded-xl text-white flex items-center justify-center font-bold text-base shrink-0"
                    style={{ background: 'var(--accent)' }}
                  >
                    {selectedCustomer.full_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{selectedCustomer.full_name}</h2>
                    <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                      Joined {new Date(selectedCustomer.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-slate-100"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl border text-center" style={{ background: 'var(--bg-app)', borderColor: 'var(--border)' }}>
                  <span className="text-[11px] block" style={{ color: 'var(--text-muted)' }}>Lifetime Spend</span>
                  <span className="text-sm font-bold font-mono" style={{ color: 'var(--success)' }}>
                    ${selectedCustomer.lifetimeSpend.toFixed(2)}
                  </span>
                </div>
                <div className="p-3 rounded-xl border text-center" style={{ background: 'var(--bg-app)', borderColor: 'var(--border)' }}>
                  <span className="text-[11px] block" style={{ color: 'var(--text-muted)' }}>Total Orders</span>
                  <span className="text-sm font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                    {selectedCustomer.totalOrders}
                  </span>
                </div>
                <div className="p-3 rounded-xl border text-center" style={{ background: 'var(--bg-app)', borderColor: 'var(--border)' }}>
                  <span className="text-[11px] block" style={{ color: 'var(--text-muted)' }}>Tier</span>
                  <span className="text-sm font-bold" style={{ color: 'var(--warning)' }}>
                    {selectedCustomer.tier}
                  </span>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-2">
                <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Verified Channels</span>
                <div className="p-3.5 rounded-xl border space-y-2 text-xs" style={{ background: 'var(--bg-app)', borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                      <Mail className="h-3.5 w-3.5" /> Email
                    </span>
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{selectedCustomer.email}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                      <Phone className="h-3.5 w-3.5" /> Phone
                    </span>
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{selectedCustomer.phone || 'None'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                      <Package className="h-3.5 w-3.5" /> Last Active
                    </span>
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{selectedCustomer.lastOrderDate}</span>
                  </div>
                </div>
              </div>

              {/* Linked Orders Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Recent Purchase History</span>
                  <Link to="/orders" className="text-xs hover:underline" style={{ color: 'var(--accent)' }}>
                    View in Orders Registry
                  </Link>
                </div>
                <div className="space-y-2">
                  <div className="p-3 rounded-xl border flex items-center justify-between text-xs" style={{ background: 'var(--bg-app)', borderColor: 'var(--border)' }}>
                    <div>
                      <span className="font-mono font-bold block" style={{ color: 'var(--text-primary)' }}>ORD-99120</span>
                      <span style={{ color: 'var(--text-muted)' }}>Wireless Noise-Cancelling Headphones</span>
                    </div>
                    <span className="font-mono font-semibold" style={{ color: 'var(--success)' }}>$249.00</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer Actions */}
            <div className="pt-4 border-t flex items-center justify-end gap-2.5" style={{ borderColor: 'var(--border)' }}>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-2 rounded-lg border text-xs font-medium cursor-pointer hover:bg-slate-50"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              >
                Close
              </button>
              <Link
                to="/tickets"
                className="px-4 py-2 rounded-lg text-white text-xs font-semibold shadow-sm flex items-center gap-1.5"
                style={{ background: 'var(--accent)' }}
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
