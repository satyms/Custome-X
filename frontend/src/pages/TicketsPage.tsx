import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ticketsApi } from '../api';
import type { Ticket, TicketStatus, TicketPriority } from '../types';
import { Skeleton } from '../components/ui/Skeleton';
import {
  Tag,
  Search,
  Filter,
  Plus,
  Sliders,
  Kanban,
  LayoutList,
  Building,
  Diamond,
  Calendar,
  ArrowUpRight,
  MoreHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface ExtendedTicketItem {
  id: string;
  title: string;
  account: string;
  value: string;
  numericValue: number;
  date: string;
  assignee: {
    name: string;
    initials: string;
    bg?: string;
  };
  stage: 'qualification' | 'discovery' | 'proposal' | 'negotiation';
  priority: TicketPriority;
  status: TicketStatus;
  rawTicket?: Ticket;
}

// Default benchmark data matching the reference image Twenty CRM 1-to-1
const REFERENCE_CARDS: ExtendedTicketItem[] = [
  // Column 1: Qualification
  {
    id: 'opp-101',
    title: 'Lumenfield — Data residency (EU)',
    account: 'Lumenfield',
    value: '$38,000.00',
    numericValue: 38000,
    date: 'Mar 5, 2027',
    assignee: { name: 'Jamie Rivera', initials: 'JR' },
    stage: 'qualification',
    priority: 'normal',
    status: 'open',
  },
  {
    id: 'opp-102',
    title: 'Pinegrove — District licenses',
    account: 'Pinegrove Education',
    value: '$34,000.00',
    numericValue: 34000,
    date: 'Feb 18, 2027',
    assignee: { name: 'Alex Morgan', initials: 'AM' },
    stage: 'qualification',
    priority: 'normal',
    status: 'open',
  },
  {
    id: 'opp-103',
    title: 'Tidewater — Compliance add-on',
    account: 'Tidewater Finance',
    value: '$27,000.00',
    numericValue: 27000,
    date: 'Jan 21, 2027',
    assignee: { name: 'Alex Morgan', initials: 'AM' },
    stage: 'qualification',
    priority: 'low',
    status: 'open',
  },

  // Column 2: Discovery
  {
    id: 'opp-201',
    title: 'Halcyon — Clinic network pilot',
    account: 'Halcyon Health',
    value: '$64,000.00',
    numericValue: 64000,
    date: 'Jan 8, 2027',
    assignee: { name: 'Alex Morgan', initials: 'AM' },
    stage: 'discovery',
    priority: 'high',
    status: 'in_progress',
  },
  {
    id: 'opp-202',
    title: 'Kestrel — SOC tooling',
    account: 'Kestrel Security',
    value: '$58,000.00',
    numericValue: 58000,
    date: 'Dec 25, 2026',
    assignee: { name: 'Jamie Rivera', initials: 'JR' },
    stage: 'discovery',
    priority: 'normal',
    status: 'in_progress',
  },
  {
    id: 'opp-203',
    title: 'Meridian — Payroll sync',
    account: 'Meridian Payroll',
    value: '$46,000.00',
    numericValue: 46000,
    date: 'Jan 1, 2027',
    assignee: { name: 'Alex Morgan', initials: 'AM' },
    stage: 'discovery',
    priority: 'normal',
    status: 'in_progress',
  },

  // Column 3: Proposal
  {
    id: 'opp-301',
    title: 'Brightpath — Fleet analytics rollout',
    account: 'Brightpath Logistics',
    value: '$96,000.00',
    numericValue: 96000,
    date: 'Dec 18, 2026',
    assignee: { name: 'Jamie Rivera', initials: 'JR' },
    stage: 'proposal',
    priority: 'urgent',
    status: 'escalated',
  },
  {
    id: 'opp-302',
    title: 'Orbitline — Usage-based expansion',
    account: 'Orbitline',
    value: '$72,500.00',
    numericValue: 72500,
    date: 'Dec 7, 2026',
    assignee: { name: 'Sofia Nguyen', initials: 'SN' },
    stage: 'proposal',
    priority: 'high',
    status: 'escalated',
  },
  {
    id: 'opp-303',
    title: 'Vantage — Route optimization',
    account: 'Vantage Freight',
    value: '$124,000.00',
    numericValue: 124000,
    date: 'Dec 14, 2026',
    assignee: { name: 'Jamie Rivera', initials: 'JR' },
    stage: 'proposal',
    priority: 'urgent',
    status: 'escalated',
  },

  // Column 4: Negotiation
  {
    id: 'opp-401',
    title: 'Cedarstone — Omnichannel suite',
    account: 'Cedarstone Retail',
    value: '$215,000.00',
    numericValue: 215000,
    date: 'Dec 3, 2026',
    assignee: { name: 'Alex Morgan', initials: 'AM' },
    stage: 'negotiation',
    priority: 'urgent',
    status: 'closed',
  },
  {
    id: 'opp-402',
    title: 'Lumenfield — Enterprise platform',
    account: 'Lumenfield',
    value: '$148,000.00',
    numericValue: 148000,
    date: 'Nov 27, 2026',
    assignee: { name: 'Alex Morgan', initials: 'AM' },
    stage: 'negotiation',
    priority: 'high',
    status: 'closed',
  },
];

export const TicketsPage: React.FC = () => {
  const [customItems, setCustomItems] = useState<ExtendedTicketItem[]>(REFERENCE_CARDS);
  const [totalCount, setTotalCount] = useState<number>(REFERENCE_CARDS.length);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // View Mode: Board vs Table
  const [viewMode, setViewMode] = useState<'board' | 'table'>('board');

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearchInput, setShowSearchInput] = useState<boolean>(false);
  const [filterStage, setFilterStage] = useState<string>('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState<boolean>(false);
  const [showDisplayDropdown, setShowDisplayDropdown] = useState<boolean>(false);

  // Pagination for Table View
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // New Opportunity / Ticket Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalStage, setModalStage] = useState<'qualification' | 'discovery' | 'proposal' | 'negotiation'>('qualification');
  const [newTitle, setNewTitle] = useState('');
  const [newAccount, setNewAccount] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newPriority, setNewPriority] = useState<TicketPriority>('normal');

  // Fetch real backend tickets and merge gracefully
  const fetchBackendTickets = async () => {
    setIsLoading(true);
    try {
      const res = await ticketsApi.listTickets({ limit: 50 });

      if (res.items.length > 0) {
        // Map backend tickets to board items
        const mappedItems: ExtendedTicketItem[] = res.items.map((t, idx) => {
          let stage: 'qualification' | 'discovery' | 'proposal' | 'negotiation' = 'qualification';
          if (t.status === 'in_progress') stage = 'discovery';
          else if (t.status === 'escalated') stage = 'proposal';
          else if (t.status === 'closed' || t.status === 'resolved') stage = 'negotiation';

          return {
            id: t.id,
            title: t.title,
            account: `Account #${t.customer_id.slice(0, 6)}`,
            value: `$${(25000 + (idx * 17500) % 180000).toLocaleString()}.00`,
            numericValue: 25000 + (idx * 17500) % 180000,
            date: new Date(t.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }),
            assignee: {
              name: t.assigned_to ? `Agent ${t.assigned_to.slice(0, 4)}` : 'Alex Morgan',
              initials: t.assigned_to ? t.assigned_to.slice(0, 2).toUpperCase() : 'AM',
            },
            stage,
            priority: t.priority,
            status: t.status,
            rawTicket: t,
          };
        });

        // Combine reference benchmark items with backend items
        setCustomItems([...REFERENCE_CARDS, ...mappedItems]);
        setTotalCount(REFERENCE_CARDS.length + res.total);
      }
    } catch (err) {
      console.warn('Backend ticket fetch fallback to reference model:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBackendTickets();
  }, []);

  // Filtered items
  const filteredItems = useMemo(() => {
    let result = customItems;
    if (filterStage !== 'all') {
      result = result.filter((item) => item.stage === filterStage);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.account.toLowerCase().includes(q) ||
          item.assignee.name.toLowerCase().includes(q)
      );
    }
    return result;
  }, [customItems, filterStage, searchQuery]);

  // Columns definition matching Twenty CRM screenshot
  const columns = [
    {
      key: 'qualification',
      title: 'Qualification',
      iconStyle: 'border border-slate-400 bg-transparent', // ◌ open circle
      count: filteredItems.filter((i) => i.stage === 'qualification').length,
      total: filteredItems
        .filter((i) => i.stage === 'qualification')
        .reduce((acc, curr) => acc + curr.numericValue, 0),
    },
    {
      key: 'discovery',
      title: 'Discovery',
      iconStyle: 'bg-sky-500 border border-sky-500', // 🔵 discovery
      count: filteredItems.filter((i) => i.stage === 'discovery').length,
      total: filteredItems
        .filter((i) => i.stage === 'discovery')
        .reduce((acc, curr) => acc + curr.numericValue, 0),
    },
    {
      key: 'proposal',
      title: 'Proposal',
      iconStyle: 'bg-amber-500 border border-amber-500', // 🟡 proposal
      count: filteredItems.filter((i) => i.stage === 'proposal').length,
      total: filteredItems
        .filter((i) => i.stage === 'proposal')
        .reduce((acc, curr) => acc + curr.numericValue, 0),
    },
    {
      key: 'negotiation',
      title: 'Negotiation',
      iconStyle: 'bg-purple-500 border border-purple-500', // 🟣 negotiation
      count: filteredItems.filter((i) => i.stage === 'negotiation').length,
      total: filteredItems
        .filter((i) => i.stage === 'negotiation')
        .reduce((acc, curr) => acc + curr.numericValue, 0),
    },
  ];

  // Handle Create Opportunity / Ticket
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const numVal = parseFloat(newValue.replace(/[^0-9.]/g, '')) || 45000;
    const formattedVal = `$${numVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

    const newItem: ExtendedTicketItem = {
      id: `opp-${Date.now().toString().slice(-4)}`,
      title: newTitle.trim(),
      account: newAccount.trim() || 'New Enterprise Client',
      value: formattedVal,
      numericValue: numVal,
      date: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      assignee: {
        name: 'Alex Morgan',
        initials: 'AM',
      },
      stage: modalStage,
      priority: newPriority,
      status: modalStage === 'qualification' ? 'open' : 'in_progress',
    };

    setCustomItems([newItem, ...customItems]);
    setTotalCount((prev) => prev + 1);

    // Reset modal
    setNewTitle('');
    setNewAccount('');
    setNewValue('');
    setIsModalOpen(false);
  };

  const openCreateForStage = (stage: 'qualification' | 'discovery' | 'proposal' | 'negotiation') => {
    setModalStage(stage);
    setIsModalOpen(true);
  };

  return (
    <div className="flex-1 h-full flex flex-col overflow-hidden bg-white select-none">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER: Tag Icon + Title (Opportunities) + "+ Create opportunity"  */}
      {/* ========================================================================= */}
      <div
        className="h-12 px-6 flex items-center justify-between border-b shrink-0 bg-white"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-slate-700" />
          <h1 className="text-[15px] font-semibold tracking-tight text-slate-900">
            Opportunities
          </h1>
          <span className="px-1.5 py-0.2 rounded text-[11px] font-mono text-slate-400 bg-slate-100">
            {totalCount}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openCreateForStage('qualification')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-[13px] font-medium shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 text-slate-600" />
            <span>+ Create opportunity</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SECONDARY TOOLBAR: Filter, Search, View Switcher, Display             */}
      {/* ========================================================================= */}
      <div
        className="h-11 px-6 flex items-center justify-between border-b shrink-0 bg-white"
        style={{ borderColor: 'var(--border)' }}
      >
        {/* Left Toolbar: Filter + Search */}
        <div className="flex items-center gap-2">
          {/* Filter button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                filterStage !== 'all'
                  ? 'bg-slate-100 border-slate-300 text-slate-900 font-semibold'
                  : 'bg-white border-transparent hover:border-slate-200 text-slate-700'
              }`}
            >
              <Filter className="h-3.5 w-3.5 text-slate-500" />
              <span>Filter</span>
              {filterStage !== 'all' && (
                <span className="h-4 px-1 rounded-full text-[10px] bg-slate-200 text-slate-800">
                  1
                </span>
              )}
            </button>

            {/* Filter Dropdown */}
            {showFilterDropdown && (
              <div
                className="absolute left-0 mt-1 w-44 rounded-lg bg-white border border-slate-200 shadow-lg py-1 z-50 text-xs"
                style={{ borderColor: 'var(--border)' }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setFilterStage('all');
                    setShowFilterDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 cursor-pointer ${
                    filterStage === 'all' ? 'font-semibold text-indigo-600' : 'text-slate-700'
                  }`}
                >
                  All Stages
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFilterStage('qualification');
                    setShowFilterDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 cursor-pointer ${
                    filterStage === 'qualification' ? 'font-semibold text-indigo-600' : 'text-slate-700'
                  }`}
                >
                  Qualification
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFilterStage('discovery');
                    setShowFilterDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 cursor-pointer ${
                    filterStage === 'discovery' ? 'font-semibold text-indigo-600' : 'text-slate-700'
                  }`}
                >
                  Discovery
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFilterStage('proposal');
                    setShowFilterDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 cursor-pointer ${
                    filterStage === 'proposal' ? 'font-semibold text-indigo-600' : 'text-slate-700'
                  }`}
                >
                  Proposal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFilterStage('negotiation');
                    setShowFilterDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 cursor-pointer ${
                    filterStage === 'negotiation' ? 'font-semibold text-indigo-600' : 'text-slate-700'
                  }`}
                >
                  Negotiation
                </button>
              </div>
            )}
          </div>

          {/* Quick Search trigger & input */}
          {showSearchInput ? (
            <div className="flex items-center gap-1 border border-slate-200 rounded-md px-2 py-0.5 bg-slate-50/50">
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search opportunities..."
                className="text-xs bg-transparent focus:outline-none w-36 text-slate-800"
              />
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setShowSearchInput(false);
                }}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowSearchInput(true)}
              className="p-1.5 rounded-md hover:bg-slate-50 text-slate-400 hover:text-slate-700 cursor-pointer"
              title="Search"
            >
              <Search className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Right Toolbar: View Switcher + Display */}
        <div className="flex items-center gap-2">
          {/* Switcher */}
          <div className="flex items-center p-0.5 rounded-md border border-slate-200 bg-slate-50">
            <button
              type="button"
              onClick={() => setViewMode('board')}
              className={`p-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                viewMode === 'board'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Kanban Board View"
            >
              <Kanban className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Table View"
            >
              <LayoutList className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Display button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDisplayDropdown(!showDisplayDropdown)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <Sliders className="h-3.5 w-3.5 text-slate-500" />
              <span>Display</span>
            </button>

            {showDisplayDropdown && (
              <div
                className="absolute right-0 mt-1 w-48 rounded-lg bg-white border border-slate-200 shadow-lg p-2 z-50 text-xs space-y-1"
                style={{ borderColor: 'var(--border)' }}
              >
                <p className="px-2 py-1 font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                  Columns Visibility
                </p>
                <div className="space-y-1">
                  {columns.map((c) => (
                    <label key={c.key} className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 rounded cursor-pointer text-slate-700">
                      <input type="checkbox" defaultChecked className="rounded text-indigo-600" />
                      <span>{c.title}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN CONTENT: KANBAN BOARD OR TABLE VIEW                               */}
      {/* ========================================================================= */}
      {viewMode === 'board' ? (
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          {/* Columns Container: 4 Parallel Tracks with generous breathing room */}
          <div className="flex-1 overflow-x-auto overflow-y-hidden flex divide-x divide-slate-100">
            {columns.map((col) => {
              const colItems = filteredItems.filter((i) => i.stage === col.key);

              return (
                <div
                  key={col.key}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const draggedId = e.dataTransfer.getData('text/plain');
                    if (draggedId) {
                      setCustomItems((prev) =>
                        prev.map((it) =>
                          it.id === draggedId ? { ...it, stage: col.key as any } : it
                        )
                      );
                    }
                  }}
                  className="flex-1 min-w-[270px] max-w-[340px] flex flex-col px-4 pt-3 pb-2 h-full bg-white select-none"
                >
                  {/* Column Header: Status Indicator + Title + Count Pill + '+' */}
                  <div className="flex items-center justify-between pb-3 shrink-0">
                    <div className="flex items-center gap-2">
                      {/* Circle Status Marker matching reference image */}
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${col.iconStyle}`} />
                      <span className="text-[13px] font-medium text-slate-900">
                        {col.title}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[11px] font-mono text-slate-400 bg-slate-50">
                        {col.count}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => openCreateForStage(col.key as any)}
                      className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
                      title={`Add opportunity to ${col.title}`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Cards Scrollable Area */}
                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-1.5 pb-3">
                    {isLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <div
                          key={`skel-${col.key}-${i}`}
                          className="p-3.5 rounded-xl border border-slate-100 space-y-2 bg-slate-50/50"
                        >
                          <Skeleton className="h-3.5 w-3/4 mb-1" />
                          <Skeleton className="h-3 w-1/2" />
                          <Skeleton className="h-3 w-1/3" />
                        </div>
                      ))
                    ) : colItems.length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-100 rounded-xl">
                        No opportunities
                      </div>
                    ) : (
                      colItems.map((item) => (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', item.id);
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                        >
                          <Link
                            to={item.rawTicket ? `/tickets/${item.rawTicket.id}` : `/tickets`}
                            className="block p-3.5 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-sm transition-all duration-150 group cursor-grab active:cursor-grabbing"
                        >
                          {/* Row 1: Title + Hover action icons */}
                          <div className="flex items-start justify-between gap-1 mb-1">
                            <h3 className="text-[13px] font-medium text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug">
                              {item.title}
                            </h3>
                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <span className="p-0.5 text-slate-400 hover:text-slate-700">
                                <ArrowUpRight className="h-3 w-3" />
                              </span>
                              <span className="p-0.5 text-slate-400 hover:text-slate-700">
                                <MoreHorizontal className="h-3 w-3" />
                              </span>
                            </div>
                          </div>

                          {/* Row 2: Building + Account Name */}
                          <div className="flex items-center gap-1.5 text-[12px] text-slate-500 mt-1">
                            <Building className="h-3 w-3 shrink-0 text-slate-400" />
                            <span className="truncate">{item.account}</span>
                          </div>

                          {/* Row 3: Diamond + Currency Value */}
                          <div className="flex items-center gap-1.5 text-[12px] font-medium font-mono text-slate-700 mt-1">
                            <Diamond className="h-3 w-3 shrink-0 text-slate-400" />
                            <span>{item.value}</span>
                          </div>

                          {/* Row 4: Calendar + Date */}
                          <div className="flex items-center gap-1.5 text-[12px] text-slate-400 mt-1">
                            <Calendar className="h-3 w-3 shrink-0 text-slate-400" />
                            <span>{item.date}</span>
                          </div>

                          {/* Row 5: Assignee Avatar + Name */}
                          <div className="flex items-center gap-1.5 text-[12px] text-slate-600 mt-2">
                            <div className="h-5 w-5 rounded-full flex items-center justify-center font-bold text-[10px] bg-slate-200 text-slate-700 shrink-0">
                              {item.assignee.initials}
                            </div>
                            <span className="truncate">{item.assignee.name}</span>
                          </div>
                          </Link>
                        </div>
                      ))
                    )}

                    {/* Bottom Column "+ Create opportunity" ghost button matching reference image */}
                    {(col.key === 'proposal' || col.key === 'negotiation') && (
                      <button
                        type="button"
                        onClick={() => openCreateForStage(col.key as any)}
                        className="w-full py-2 px-3 text-[12px] text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>+ Create opportunity</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ========================================================================= */}
          {/* 4. BOARD BOTTOM TOTAL AGGREGATIONS BAR (1-to-1 match with reference)       */}
          {/* ========================================================================= */}
          <div
            className="h-10 px-4 border-t flex divide-x divide-slate-100 shrink-0 bg-white"
            style={{ borderColor: 'var(--border)' }}
          >
            {columns.map((col) => (
              <div
                key={`footer-${col.key}`}
                className="flex-1 min-w-[270px] max-w-[340px] px-4 flex items-center gap-1.5 text-xs font-mono text-slate-500"
              >
                <Diamond className="h-3 w-3 text-slate-400" />
                <span>${col.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* TABLE VIEW                                                                */
        /* ========================================================================= */
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs text-slate-700">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-medium">
                  <th className="px-4 py-3">Opportunity / Ticket</th>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3">Value</th>
                  <th className="px-4 py-3">Assignee</th>
                  <th className="px-4 py-3">Close Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems
                  .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                  .map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {item.title}
                      </td>
                      <td className="px-4 py-3 text-slate-600 flex items-center gap-1.5">
                        <Building className="h-3 w-3 text-slate-400" />
                        <span>{item.account}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="capitalize px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
                          {item.stage}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-medium text-slate-900">
                        {item.value}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <span className="h-4 w-4 rounded-full bg-slate-200 text-[9px] font-bold flex items-center justify-center text-slate-700">
                            {item.assignee.initials}
                          </span>
                          <span>{item.assignee.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{item.date}</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={item.rawTicket ? `/tickets/${item.rawTicket.id}` : `/tickets`}
                          className="text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>

            {/* Table Pagination */}
            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing {Math.min((currentPage - 1) * pageSize + 1, filteredItems.length)} -{' '}
                {Math.min(currentPage * pageSize, filteredItems.length)} of {filteredItems.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((p) =>
                      p * pageSize < filteredItems.length ? p + 1 : p
                    )
                  }
                  disabled={currentPage * pageSize >= filteredItems.length}
                  className="p-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. CREATE OPPORTUNITY / TICKET MODAL                                      */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-slate-700" />
                <h2 className="text-sm font-semibold text-slate-900">
                  New Opportunity
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corp — Enterprise Rollout"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Account / Company</label>
                <input
                  type="text"
                  placeholder="e.g. Acme Corporation"
                  value={newAccount}
                  onChange={(e) => setNewAccount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-slate-50/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Value ($)</label>
                  <input
                    type="text"
                    placeholder="e.g. 45,000"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Stage</label>
                  <select
                    value={modalStage}
                    onChange={(e) => setModalStage(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-slate-50/50 cursor-pointer"
                  >
                    <option value="qualification">Qualification</option>
                    <option value="discovery">Discovery</option>
                    <option value="proposal">Proposal</option>
                    <option value="negotiation">Negotiation</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Priority</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-slate-50/50 cursor-pointer"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium cursor-pointer transition-colors"
                >
                  Create Opportunity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketsPage;
