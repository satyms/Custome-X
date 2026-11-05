import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Search,
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Ticket as TicketIcon,
  X,
  CreditCard,
  MapPin,
} from 'lucide-react';

export interface OrderItem {
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  orderDate: string;
  totalAmount: number;
  currency: string;
  status: 'delivered' | 'in_transit' | 'processing' | 'cancelled' | 'refunded';
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  shippingAddress: string;
  paymentMethod: string;
  items: OrderItem[];
}

const SAMPLE_ORDERS: Order[] = [
  {
    id: 'o-101',
    orderNumber: 'ORD-99120',
    customerId: 'c-881',
    customerName: 'Marcus Vance',
    customerEmail: 'marcus.v@acme.org',
    orderDate: '2026-03-20T14:32:00Z',
    totalAmount: 148.50,
    currency: 'USD',
    status: 'in_transit',
    carrier: 'FedEx',
    trackingNumber: 'FX-884192039',
    trackingUrl: 'https://www.fedex.com/fedextrack/?trknbr=884192039',
    shippingAddress: '742 Evergreen Terrace, Springfield, OR 97477',
    paymentMethod: 'Visa •••• 4242',
    items: [
      { sku: 'HDPH-NC-BLK', name: 'Pro Wireless ANC Headphones (Matte Black)', quantity: 1, unitPrice: 129.00 },
      { sku: 'CBL-USB-C-2M', name: 'Braided USB-C Fast Charge Cable (2m)', quantity: 1, unitPrice: 19.50 },
    ],
  },
  {
    id: 'o-102',
    orderNumber: 'ORD-99144',
    customerId: 'c-882',
    customerName: 'Samantha Green',
    customerEmail: 's.green@example.com',
    orderDate: '2026-03-24T09:12:00Z',
    totalAmount: 320.00,
    currency: 'USD',
    status: 'processing',
    carrier: 'UPS',
    trackingNumber: '1Z9999999999999999',
    trackingUrl: 'https://www.ups.com/track?tracknum=1Z9999999999999999',
    shippingAddress: '120 Broadway, Suite 1400, New York, NY 10271',
    paymentMethod: 'Mastercard •••• 8812',
    items: [
      { sku: 'SPKR-HI-FI', name: 'Studio Reference Hi-Fi Bookshelf Monitor', quantity: 2, unitPrice: 160.00 },
    ],
  },
  {
    id: 'o-103',
    orderNumber: 'ORD-99081',
    customerId: 'c-883',
    customerName: 'Devon Lee',
    customerEmail: 'devon.lee@techstart.io',
    orderDate: '2026-03-10T16:45:00Z',
    totalAmount: 89.99,
    currency: 'USD',
    status: 'delivered',
    carrier: 'DHL Express',
    trackingNumber: 'DHL-77129841',
    trackingUrl: 'https://www.dhl.com/track?id=77129841',
    shippingAddress: '450 Mission Street, San Francisco, CA 94105',
    paymentMethod: 'Apple Pay',
    items: [
      { sku: 'MCH-KEY-RGB', name: 'Ergonomic Mechanical Keyboard (Gateron Brown)', quantity: 1, unitPrice: 89.99 },
    ],
  },
  {
    id: 'o-104',
    orderNumber: 'ORD-99042',
    customerId: 'c-884',
    customerName: 'Elena Rostova',
    customerEmail: 'elena.rostova@global.de',
    orderDate: '2026-02-28T11:20:00Z',
    totalAmount: 450.00,
    currency: 'USD',
    status: 'refunded',
    carrier: 'FedEx',
    trackingNumber: 'FX-338192014',
    shippingAddress: 'Friedrichstraße 43, 10117 Berlin, Germany',
    paymentMethod: 'PayPal',
    items: [
      { sku: 'CAM-4K-WEB', name: 'UltraHD 4K Streaming Camera System', quantity: 1, unitPrice: 450.00 },
    ],
  },
];

export const OrdersPage: React.FC = () => {
  const [orders] = useState<Order[]>(SAMPLE_ORDERS);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.trackingNumber && o.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'delivered':
        return (
          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium"
            style={{ background: 'var(--success-light)', color: 'var(--success)' }}
          >
            <CheckCircle2 className="h-3 w-3" /> Delivered
          </span>
        );
      case 'in_transit':
        return (
          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium"
            style={{ background: 'var(--sky-light)', color: 'var(--sky)' }}
          >
            <Truck className="h-3 w-3" /> In Transit
          </span>
        );
      case 'processing':
        return (
          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium"
            style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}
          >
            <Clock className="h-3 w-3" /> Processing
          </span>
        );
      case 'refunded':
        return (
          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium"
            style={{ background: '#FAF5FF', color: '#9333EA' }}
          >
            <RotateCcw className="h-3 w-3" /> Refunded
          </span>
        );
      default:
        return (
          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium"
            style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}
          >
            <AlertTriangle className="h-3 w-3" /> Cancelled
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Twenty CRM Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2.5">
          <Package className="h-5 w-5 text-slate-700" />
          <div className="flex items-center gap-2">
            <h1 className="text-[16px] font-semibold tracking-tight text-slate-900">
              Orders Registry
            </h1>
            <span className="px-1.5 py-0.2 rounded text-[11px] font-mono text-slate-400 bg-slate-100">
              {filteredOrders.length}
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by order #, tracking #, or name..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border text-xs focus:outline-none"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-xs focus:outline-none cursor-pointer"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            <option value="all">All Statuses</option>
            <option value="in_transit">In Transit</option>
            <option value="processing">Processing</option>
            <option value="delivered">Delivered</option>
            <option value="refunded">Refunded</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-xl border overflow-hidden shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase font-semibold tracking-wider border-b" style={{ background: 'var(--bg-muted)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
              <tr>
                <th scope="col" className="px-6 py-3.5">Order Reference</th>
                <th scope="col" className="px-6 py-3.5">Customer</th>
                <th scope="col" className="px-6 py-3.5">Fulfillment Status</th>
                <th scope="col" className="px-6 py-3.5">Tracking &amp; Carrier</th>
                <th scope="col" className="px-6 py-3.5">Total Amount</th>
                <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center" style={{ color: 'var(--text-muted)' }}>
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No orders matching criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <td className="px-6 py-4 font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                        <span>{order.orderNumber}</span>
                      </div>
                      <span className="text-[11px] font-sans font-normal block mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {new Date(order.orderDate).toLocaleDateString()}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-xs">
                      <span className="font-semibold block" style={{ color: 'var(--text-primary)' }}>{order.customerName}</span>
                      <span className="font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>{order.customerEmail}</span>
                    </td>

                    <td className="px-6 py-4">{getStatusBadge(order.status)}</td>

                    <td className="px-6 py-4 text-xs font-mono">
                      {order.carrier && order.trackingNumber ? (
                        <div className="space-y-0.5">
                          <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{order.carrier}</span>
                          <span className="block truncate max-w-[150px]" style={{ color: 'var(--accent)' }}>
                            {order.trackingNumber}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>

                    <td className="px-6 py-4 font-mono font-bold text-xs" style={{ color: 'var(--success)' }}>
                      ${order.totalAmount.toFixed(2)}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrder(order);
                        }}
                        className="px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors hover:bg-slate-50 cursor-pointer"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                      >
                        Inspect Order
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-xs p-4">
          <div
            className="w-full max-w-2xl rounded-2xl border p-6 shadow-2xl space-y-5"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--border)' }}>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-lg font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{selectedOrder.orderNumber}</h2>
                  {getStatusBadge(selectedOrder.status)}
                </div>
                <span className="text-xs mt-1 block" style={{ color: 'var(--text-muted)' }}>
                  Purchased on {new Date(selectedOrder.orderDate).toLocaleString()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-slate-100"
                style={{ color: 'var(--text-muted)' }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Line Items List */}
            <div className="space-y-2">
              <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Purchased Items</span>
              <div className="rounded-xl border divide-y" style={{ background: 'var(--bg-app)', borderColor: 'var(--border)' }}>
                {selectedOrder.items.map((item) => (
                  <div key={item.sku} className="p-3.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold block" style={{ color: 'var(--text-primary)' }}>{item.name}</span>
                      <span className="font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>SKU: {item.sku} × {item.quantity}</span>
                    </div>
                    <span className="font-mono font-bold" style={{ color: 'var(--text-secondary)' }}>
                      ${(item.unitPrice * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Logistics & Delivery Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl border space-y-1" style={{ background: 'var(--bg-app)', borderColor: 'var(--border)' }}>
                <span className="font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                  <MapPin className="h-3.5 w-3.5" /> Shipping Destination
                </span>
                <p className="leading-relaxed font-sans" style={{ color: 'var(--text-primary)' }}>{selectedOrder.shippingAddress}</p>
              </div>

              <div className="p-3.5 rounded-xl border space-y-1" style={{ background: 'var(--bg-app)', borderColor: 'var(--border)' }}>
                <span className="font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                  <CreditCard className="h-3.5 w-3.5" /> Payment &amp; Carrier
                </span>
                <div className="space-y-0.5" style={{ color: 'var(--text-secondary)' }}>
                  <div>Method: {selectedOrder.paymentMethod}</div>
                  <div>Carrier: {selectedOrder.carrier || 'Standard Freight'}</div>
                  {selectedOrder.trackingNumber && (
                    <div className="font-mono" style={{ color: 'var(--accent)' }}>
                      Tracking: {selectedOrder.trackingNumber}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
              <div className="text-sm font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                Total: ${selectedOrder.totalAmount.toFixed(2)}
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2 rounded-lg border text-xs font-medium cursor-pointer hover:bg-slate-50"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                >
                  Close
                </button>

                <Link
                  to={`/tickets`}
                  className="px-4 py-2 rounded-lg text-white text-xs font-semibold shadow-sm flex items-center gap-1.5"
                  style={{ background: 'var(--accent)' }}
                >
                  <TicketIcon className="h-3.5 w-3.5" />
                  <span>Create Ticket from Order</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
