'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Area, AreaChart } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Activity, PieChart as PieIcon, BarChart3, ArrowUpRight, ArrowDownRight, Target, Percent, Calendar, TrendingUpIcon } from 'lucide-react';
import StatCard from './StatCard';
import { findStockCodeSync } from '../../lib/stock-codes';

interface VakifRecord {
  id?: number;
  date: string;
  type: 'gelir' | 'gider';
  amount: number;
  description: string;
  category: string;
  source: string;
}

interface StockData {
  symbol: string;
  totalVolume: number;
  buyVolume: number;
  sellVolume: number;
  netPosition: number;
  transactions: number;
  buyTransactions: number;
  sellTransactions: number;
  avgPrice: number;
  lastAction: 'buy' | 'sell';
}

interface StockPerformance {
  symbol: string;
  totalBuy: number;
  totalSell: number;
  realizedPnL: number;
  totalCommission: number;
  netReturn: number;
  returnPercentage: number;
  transactionCount: number;
  winRate: number;
  avgReturnPerTrade: number;
}

interface MonthlyPerformance {
  month: string;
  totalVolume: number;
  realizedPnL: number;
  commissionPaid: number;
  netReturn: number;
  transactionCount: number;
  returnPercentage: number;
}

interface DailySummary {
  date: string;
  totalIncome: number;
  totalExpense: number;
  netAmount: number;
  transactionCount: number;
  stockTransactions: number;
  commissionPaid: number;
}

interface DashboardData {
  records: VakifRecord[];
  summary: {
    totalIncome: number;
    totalExpense: number;
    netIncome: number;
    recordCount: number;
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658'];

// Türkçe sayı formatlaması
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const formatNumber = (number: number): string => {
  return new Intl.NumberFormat('tr-TR').format(number);
};

const formatPercent = (value: number): string => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
};

// İşlem detaylarını parse eden fonksiyon
const parseTransactionDetails = (record: VakifRecord) => {
  const { description } = record;
  
  // Hisse kodu
  const stockMatch = description.match(/^([A-Z]{4,6})\s+Hisse/);
  const symbol = stockMatch ? stockMatch[1] : '-';
  
  // Adet
  const countMatch = description.match(/\((\d{1,3}(?:\.\d{3})*(?:,\d+)?)\s+adet/);
  const count = countMatch ? parseFloat(countMatch[1].replace(/\./g, '').replace(',', '.')) : 0;
  
  // Birim fiyat
  const priceMatch = description.match(/x\s*([\d,.]+)\s*TL/);
  const unitPrice = priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : 0;
  
  // İşlem tipi
  const type = description.includes('Alım') ? 'Alış' : description.includes('Satış') ? 'Satış' : '-';
  
  // Komisyon çıkarma
  const commissionMatch = description.match(/Komisyon:\s*([\d,.]+)\s*TL/);
  const bsmvMatch = description.match(/BSMV:\s*([\d,.]+)\s*TL/);
  const commission = (commissionMatch ? parseFloat(commissionMatch[1].replace(',', '.')) : 0) +
                    (bsmvMatch ? parseFloat(bsmvMatch[1].replace(',', '.')) : 0);
  
  return {
    symbol,
    count,
    unitPrice,
    type,
    commission
  };
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterSymbol, setFilterSymbol] = useState('');
  const [filterType, setFilterType] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showMobileCards, setShowMobileCards] = useState(false);
  const recordsPerPage = 25;

  useEffect(() => {
    fetchData();
    
    // Mobil cihaz kontrolü
    const checkMobile = () => {
      setShowMobileCards(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/data');
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Veri yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Veri Bulunamadı</h2>
          <p className="text-gray-600">Lütfen PDF dosyası yükleyin</p>
        </div>
      </div>
    );
  }

  // Hisse senetlerini filtrele ve analiz et
  const stockRecords = data.records.filter(record => {
    const details = parseTransactionDetails(record);
    return details.symbol !== '-' && (details.type === 'Alış' || details.type === 'Satış');
  });

  // Hisse bazında performans analizi
  const stockPerformanceMap = new Map<string, StockPerformance>();
  
  stockRecords.forEach(record => {
    const details = parseTransactionDetails(record);
    const symbol = details.symbol;
    
    if (!stockPerformanceMap.has(symbol)) {
      stockPerformanceMap.set(symbol, {
        symbol,
        totalBuy: 0,
        totalSell: 0,
        realizedPnL: 0,
        totalCommission: 0,
        netReturn: 0,
        returnPercentage: 0,
        transactionCount: 0,
        winRate: 0,
        avgReturnPerTrade: 0
      });
    }
    
    const stock = stockPerformanceMap.get(symbol)!;
    stock.transactionCount++;
    stock.totalCommission += details.commission;
    
    if (details.type === 'Alış') {
      stock.totalBuy += record.amount;
    } else if (details.type === 'Satış') {
      stock.totalSell += record.amount;
    }
  });

  // Net kar/zarar hesaplama
  stockPerformanceMap.forEach((stock, symbol) => {
    stock.realizedPnL = stock.totalSell - stock.totalBuy;
    stock.netReturn = stock.realizedPnL - stock.totalCommission;
    stock.returnPercentage = stock.totalBuy > 0 ? (stock.realizedPnL / stock.totalBuy) * 100 : 0;
    stock.avgReturnPerTrade = stock.transactionCount > 0 ? stock.netReturn / stock.transactionCount : 0;
    stock.winRate = stock.realizedPnL > 0 ? 100 : 0; // Basit win rate (daha detaylı trade-by-trade analiz gerekir)
  });

  const stockPerformanceData = Array.from(stockPerformanceMap.values())
    .sort((a, b) => b.netReturn - a.netReturn);

  // Aylık performans analizi
  const monthlyMap = new Map<string, MonthlyPerformance>();
  
  stockRecords.forEach(record => {
    const details = parseTransactionDetails(record);
    const date = new Date(record.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, {
        month: monthKey,
        totalVolume: 0,
        realizedPnL: 0,
        commissionPaid: 0,
        netReturn: 0,
        transactionCount: 0,
        returnPercentage: 0
      });
    }
    
    const monthly = monthlyMap.get(monthKey)!;
    monthly.transactionCount++;
    monthly.totalVolume += record.amount;
    monthly.commissionPaid += details.commission;
    
    if (details.type === 'Satış') {
      monthly.realizedPnL += record.amount;
    } else if (details.type === 'Alış') {
      monthly.realizedPnL -= record.amount;
    }
  });

  monthlyMap.forEach((monthly) => {
    monthly.netReturn = monthly.realizedPnL - monthly.commissionPaid;
    monthly.returnPercentage = monthly.totalVolume > 0 ? (monthly.netReturn / monthly.totalVolume) * 100 : 0;
  });

  const monthlyPerformanceData = Array.from(monthlyMap.values())
    .sort((a, b) => a.month.localeCompare(b.month));

  // Hisse bazında güncel pozisyon analizi
  const stockData: StockData[] = [];
  const stockMap = new Map<string, any>();

  stockRecords.forEach(record => {
    const details = parseTransactionDetails(record);
    const symbol = details.symbol;

    if (!stockMap.has(symbol)) {
      stockMap.set(symbol, {
        symbol,
        totalVolume: 0,
        buyVolume: 0,
        sellVolume: 0,
        netPosition: 0,
        transactions: 0,
        buyTransactions: 0,
        sellTransactions: 0,
        lastAction: 'buy' as 'buy' | 'sell',
        lastDate: new Date(record.date)
      });
    }

    const stock = stockMap.get(symbol);
    stock.transactions++;
    stock.totalVolume += record.amount;

    if (details.type === 'Alış') {
      stock.buyVolume += record.amount;
      stock.buyTransactions++;
      if (new Date(record.date) >= stock.lastDate) {
        stock.lastAction = 'buy';
        stock.lastDate = new Date(record.date);
      }
    } else if (details.type === 'Satış') {
      stock.sellVolume += record.amount;
      stock.sellTransactions++;
      if (new Date(record.date) >= stock.lastDate) {
        stock.lastAction = 'sell';
        stock.lastDate = new Date(record.date);
      }
    }

    stock.netPosition = stock.sellVolume - stock.buyVolume;
  });

  stockMap.forEach((stock, symbol) => {
    stockData.push(stock);
  });

  stockData.sort((a, b) => b.totalVolume - a.totalVolume);

  // İşlemler listesi hazırlama
  const processedRecords = stockRecords.map(record => ({
    ...record,
    ...parseTransactionDetails(record)
  }));

  // Filtreleme
  const filteredRecords = processedRecords.filter(record => {
    const symbolMatch = filterSymbol === '' || record.symbol.toLowerCase().includes(filterSymbol.toLowerCase());
    const typeMatch = filterType === '' || record.type === filterType;
    return symbolMatch && typeMatch;
  });

  // Sıralama
  const sortedRecords = [...filteredRecords].sort((a, b) => {
    let aValue: any, bValue: any;

    switch (sortField) {
      case 'date':
        aValue = new Date(a.date);
        bValue = new Date(b.date);
        break;
      case 'symbol':
        aValue = a.symbol;
        bValue = b.symbol;
        break;
      case 'count':
        aValue = a.count;
        bValue = b.count;
        break;
      case 'unitPrice':
        aValue = a.unitPrice;
        bValue = b.unitPrice;
        break;
      case 'amount':
        aValue = a.amount;
        bValue = b.amount;
        break;
      case 'type':
        aValue = a.type;
        bValue = b.type;
        break;
      default:
        aValue = a.date;
        bValue = b.date;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(sortedRecords.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentRecords = sortedRecords.slice(startIndex, endIndex);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Smooth scroll to top of transactions section
    const element = document.getElementById('transactions-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Günlük özet hesaplama
  const latestDate = data.records.reduce((latest, record) => {
    const recordDate = new Date(record.date);
    return recordDate > latest ? recordDate : latest;
  }, new Date(0));

  const latestDayRecords = data.records.filter(record => {
    const recordDate = new Date(record.date);
    return recordDate.toDateString() === latestDate.toDateString();
  });

  const dailySummary: DailySummary = {
    date: latestDate.toISOString().split('T')[0],
    totalIncome: latestDayRecords.filter(r => r.type === 'gelir').reduce((sum, r) => sum + r.amount, 0),
    totalExpense: latestDayRecords.filter(r => r.type === 'gider').reduce((sum, r) => sum + r.amount, 0),
    netAmount: 0,
    transactionCount: latestDayRecords.length,
    stockTransactions: latestDayRecords.filter(r => parseTransactionDetails(r).symbol !== '-').length,
    commissionPaid: latestDayRecords.reduce((sum, r) => sum + parseTransactionDetails(r).commission, 0)
  };
  dailySummary.netAmount = dailySummary.totalIncome - dailySummary.totalExpense;

  // Son 2 aylık trend verisi
  const last60Days = Array.from({ length: 60 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date.toISOString().split('T')[0];
  }).reverse();

  const monthlyChartData = last60Days.map(date => {
    const dayRecords = data.records.filter(record => record.date === date);
    const income = dayRecords.filter(r => r.type === 'gelir').reduce((sum, r) => sum + r.amount, 0);
    const expense = dayRecords.filter(r => r.type === 'gider').reduce((sum, r) => sum + r.amount, 0);
    
    return {
      date: new Date(date).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }),
      income,
      expense,
      net: income - expense
    };
  }).filter(item => item.income > 0 || item.expense > 0); // Sadece işlem olan günleri göster

  // Toplam istatistikler
  const totalStats = {
    totalVolume: stockPerformanceData.reduce((sum, stock) => sum + stock.totalBuy + stock.totalSell, 0),
    totalBuy: stockPerformanceData.reduce((sum, stock) => sum + stock.totalBuy, 0),
    totalCommission: stockPerformanceData.reduce((sum, stock) => sum + stock.totalCommission, 0)
  };

  return (
    <div className="space-y-6 p-4 max-w-7xl mx-auto">
      {/* Özet Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Toplam Hacim"
          value={formatCurrency(totalStats.totalVolume)}
          icon={<DollarSign className="h-6 w-6" />}
          trend={5.2}
        />
        <StatCard
          title="Net Satış-Alım"
          value={formatCurrency(stockPerformanceData.reduce((sum, stock) => sum + (stock.totalSell - stock.totalBuy), 0))}
          icon={<TrendingUp className="h-6 w-6" />}
          trend={3.4}
        />
        <StatCard
          title="Toplam Komisyon"
          value={formatCurrency(totalStats.totalCommission)}
          icon={<Activity className="h-6 w-6" />}
          trend={0}
        />
      </div>

            {/* Toplam Hacim Grafiği */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Günlük İşlem Hacmi</h2>
          <Activity className="h-5 w-5 text-gray-400" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={monthlyChartData}>
              <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  formatCurrency(value), 
                  name === 'income' ? 'Satım' : name === 'expense' ? 'Alım' : 'Toplam Hacim'
                ]}
              />
            <Area type="monotone" dataKey="income" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
            <Area type="monotone" dataKey="expense" stackId="1" stroke="#EF4444" fill="#EF4444" fillOpacity={0.3} />
          </AreaChart>
          </ResponsiveContainer>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Hisse İşlem Özeti */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <DollarSign className="h-5 w-5 mr-2 text-blue-600" />
              Hisse İşlem Özeti
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {stockPerformanceData.map((stock) => {
                const netAmount = stock.totalSell - stock.totalBuy;
                const isNetBuy = netAmount < 0;
                return (
                  <div key={stock.symbol} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-bold text-blue-900">{stock.symbol}</div>
                      <div className="text-xs text-gray-500">
                        {stock.transactionCount} işlem • {formatCurrency(stock.totalCommission)} komisyon
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${isNetBuy ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(Math.abs(netAmount))}
                      </div>
                      <div className="text-xs text-gray-500">
                        {isNetBuy ? 'Net Alım' : 'Net Satış'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
        </div>
      </div>

                {/* Aylık İşlem Özeti */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-blue-600" />
              Aylık İşlem Özeti
          </h2>
        </div>
        <div className="p-6">
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {monthlyPerformanceData.map((month) => (
                <div key={month.month} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-bold text-gray-900">
                      {new Date(month.month + '-01').toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
                    </div>
                    <div className="text-xs text-gray-500">
                      {month.transactionCount} işlem
            </div>
            </div>
                  <div className="text-right">
                    <div className="font-bold text-blue-600">
                      {formatCurrency(month.totalVolume)}
              </div>
                    <div className="text-xs text-gray-500">
                      Komisyon: {formatCurrency(month.commissionPaid)}
            </div>
            </div>
            </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobil Kart Formatı & Desktop Tablo */}
      <div id="transactions-section" className="bg-white rounded-lg shadow-sm border">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Tüm İşlemler ({filteredRecords.length} işlem)
            </h2>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              <input
                type="text"
                placeholder="Hisse Kodu Ara..."
                value={filterSymbol}
                onChange={(e) => setFilterSymbol(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Tüm İşlemler</option>
                <option value="Alış">Alış</option>
                <option value="Satış">Satış</option>
              </select>
            </div>
          </div>
        </div>

        {/* Mobil Kart Görünümü */}
        <div className="md:hidden">
          <div className="p-4 space-y-3">
            {currentRecords.map((record, index) => (
              <div key={record.id || index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-blue-900 text-lg">{record.symbol}</span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        record.type === 'Satış' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {record.type === 'Satış' ? (
                          <>
                            <ArrowDownRight className="w-3 h-3 mr-1" />
                            Satış
                          </>
                        ) : (
                          <>
                            <ArrowUpRight className="w-3 h-3 mr-1" />
                            Alış
                          </>
                        )}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {new Date(record.date).toLocaleDateString('tr-TR')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${
                      record.type === 'Satış' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {record.type === 'Satış' ? '+' : '-'}{formatCurrency(record.amount)}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Adet:</span>
                    <span className="ml-1 font-medium">{record.count > 0 ? formatNumber(record.count) : '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Birim:</span>
                    <span className="ml-1 font-medium">
                      {record.unitPrice > 0 ? `${record.unitPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL` : '-'}
                    </span>
                  </div>
                  {record.commission > 0 && (
                    <div className="col-span-2">
                      <span className="text-gray-500">Komisyon:</span>
                      <span className="ml-1 font-medium text-orange-600">{formatCurrency(record.commission)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop Tablo Görünümü */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('date')}
                >
                  Tarih {sortField === 'date' && (sortDirection === 'asc' ? ' ↑' : ' ↓')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('symbol')}
                >
                  Hisse {sortField === 'symbol' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('count')}
                >
                  Adet {sortField === 'count' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('unitPrice')}
                >
                  Birim Fiyat {sortField === 'unitPrice' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('amount')}
                >
                  Toplam Tutar {sortField === 'amount' && (sortDirection === 'asc' ? ' ↑' : ' ↓')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Komisyon
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('type')}
                >
                  Tip {sortField === 'type' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentRecords.map((record, index) => (
                <tr key={record.id || index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(record.date).toLocaleDateString('tr-TR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900">
                    {record.symbol}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.count > 0 ? formatNumber(record.count) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.unitPrice > 0 ? `${record.unitPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL` : '-'}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                    record.type === 'Satış' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {record.type === 'Satış' ? '+' : '-'}{formatCurrency(record.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600 font-medium">
                    {record.commission > 0 ? formatCurrency(record.commission) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      record.type === 'Satış' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {record.type === 'Satış' ? (
                        <>
                          <ArrowDownRight className="w-3 h-3 mr-1" />
                          Satış
                        </>
                      ) : (
                        <>
                          <ArrowUpRight className="w-3 h-3 mr-1" />
                          Alış
                        </>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-4 sm:px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-sm text-gray-700">
                <span className="font-medium">{startIndex + 1}</span> - <span className="font-medium">{Math.min(endIndex, filteredRecords.length)}</span> arası, 
                toplam <span className="font-medium">{filteredRecords.length}</span> kayıt
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  className="px-2 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  «
                </button>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Önceki
                </button>
                
                {/* Page Numbers */}
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-1 text-sm border border-gray-300 rounded ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Sonraki
                </button>
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  »
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 