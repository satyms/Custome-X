import React, { useEffect, useState } from 'react';
import { customersApi } from '../api';
import type { Customer } from '../types';
import { Users, Mail, Phone, Calendar, Loader2 } from 'lucide-react';

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await customersApi.listCustomers({ limit: 50 });
        setCustomers(res.items);
      } catch (err) {
        console.error('Failed to load customers:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCustomers();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Customer Directory</h1>
        <p className="mt-1 text-sm text-slate-400">
          Customers registered in your tenant organization
        </p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-16 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mr-2" />
            <span>Loading customers...</span>
          </div>
        ) : customers.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <Users className="h-10 w-10 mx-auto text-slate-600 mb-3" />
            <p className="text-sm">No customers registered yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/60 text-xs uppercase text-slate-400 font-semibold tracking-wider border-b border-slate-800">
                <tr>
                  <th scope="col" className="px-6 py-3.5">Customer Name</th>
                  <th scope="col" className="px-6 py-3.5">Email</th>
                  <th scope="col" className="px-6 py-3.5">Phone</th>
                  <th scope="col" className="px-6 py-3.5">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-white flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center text-xs font-semibold">
                        {c.full_name.slice(0, 2).toUpperCase()}
                      </div>
                      <span>{c.full_name}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-slate-500" />
                        <span>{c.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {c.phone ? (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-slate-500" />
                          <span>{c.phone}</span>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-500" />
                        <span>{new Date(c.created_at).toLocaleDateString()}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomersPage;
