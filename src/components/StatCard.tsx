'use client';

import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: number;
  color?: 'blue' | 'green' | 'red' | 'purple' | 'yellow';
}

export default function StatCard({ title, value, icon, trend, color = 'blue' }: StatCardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      return val.toLocaleString();
    }
    return val;
  };

  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200'
  };

  const getTrendColor = (trendValue?: number) => {
    if (!trendValue) return 'text-gray-500';
    return trendValue >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getTrendIcon = (trendValue?: number) => {
    if (!trendValue) return null;
    return trendValue >= 0 ? '↗' : '↘';
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{formatValue(value)}</p>
          {trend !== undefined && (
            <p className={`text-sm font-medium mt-1 ${getTrendColor(trend)}`}>
              {getTrendIcon(trend)} {Math.abs(trend)}%
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg border ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
} 