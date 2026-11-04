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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="h-3 w-3" /> Delivered
          </span>
        );
      case 'in_transit':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30">
            <Truck className="h-3 w-3" /> In Transit
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Clock className="h-3 w-3" /> Processing
          </span>
        );
      case 'refunded':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/30">
            <RotateCcw className="h-3 w-3" /> Refunded
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <AlertTriangle className="h-3 w-3" /> Cancelled
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">E-Commerce Orders Registry</h1>
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-mono font-medium">
              Store Order Hub
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Track package shipments, line items, carrier tracking, and order dispute actions.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by order #, tracking #, or name..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
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
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs uppercase text-slate-400 font-semibold tracking-wider border-b border-slate-800">
              <tr>
                <th scope="col" className="px-6 py-4">Order Reference</th>
                <th scope="col" className="px-6 py-4">Customer</th>
                <th scope="col" className="px-6 py-4">Fulfillment Status</th>
                <th scope="col" className="px-6 py-4">Tracking &amp; Carrier</th>
                <th scope="col" className="px-6 py-4">Total Amount</th>
                <th scope="col" className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">
                    <Package className="h-8 w-8 mx-auto text-slate-600 mb-2" />
                    No orders matching criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-slate-800/30 transition-colors cursor-pointer"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <td className="px-6 py-4 font-mono font-bold text-white">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-indigo-400" />
                        <span>{order.orderNumber}</span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-sans font-normal block mt-0.5">
                        {new Date(order.orderDate).toLocaleDateString()}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-xs">
                      <span className="font-semibold text-white block">{order.customerName}</span>
                      <span className="text-slate-400 font-mono text-[11px]">{order.customerEmail}</span>
                    </td>

                    <td className="px-6 py-4">{getStatusBadge(order.status)}</td>

                    <td className="px-6 py-4 text-xs font-mono">
                      {order.carrier && order.trackingNumber ? (
                        <div className="space-y-0.5">
                          <span className="text-slate-200 font-semibold">{order.carrier}</span>
                          <span className="text-indigo-400 block truncate max-w-[150px]">
                            {order.trackingNumber}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>

                    <td className="px-6 py-4 font-mono font-bold text-emerald-400 text-xs">
                      ${order.totalAmount.toFixed(2)}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrder(order);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-medium border border-slate-700/80 transition-colors cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-lg font-bold text-white font-mono">{selectedOrder.orderNumber}</h2>
                  {getStatusBadge(selectedOrder.status)}
                </div>
                <span className="text-xs text-slate-400 mt-1 block">
                  Purchased on {new Date(selectedOrder.orderDate).toLocaleString()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-850 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Line Items List */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-300">Purchased Items</span>
              <div className="rounded-xl border border-slate-800 bg-slate-950 divide-y divide-slate-800/80">
                {selectedOrder.items.map((item) => (
                  <div key={item.sku} className="p-3.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-white block">{item.name}</span>
                      <span className="text-slate-500 font-mono text-[11px]">SKU: {item.sku} × {item.quantity}</span>
                    </div>
                    <span className="font-mono font-bold text-slate-200">
                      ${(item.unitPrice * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Logistics & Delivery Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="font-semibold text-slate-400 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-500" /> Shipping Destination
                </span>
                <p className="text-slate-200 leading-relaxed font-sans">{selectedOrder.shippingAddress}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="font-semibold text-slate-400 flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-slate-500" /> Payment &amp; Carrier
                </span>
                <div className="space-y-0.5 text-slate-300">
                  <div>Method: {selectedOrder.paymentMethod}</div>
                  <div>Carrier: {selectedOrder.carrier || 'Standard Freight'}</div>
                  {selectedOrder.trackingNumber && (
                    <div className="text-indigo-400 font-mono">
                      Tracking: {selectedOrder.trackingNumber}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <div className="text-sm font-bold text-white font-mono">
                Total: ${selectedOrder.totalAmount.toFixed(2)}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>

                <Link
                  to={`/tickets`}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
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
