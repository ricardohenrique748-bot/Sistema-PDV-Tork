import React from 'react';
import { Loader2 } from 'lucide-react';

// Button
export const Button = ({ children, variant = 'primary', size = 'md', loading, className = '', ...props }) => {
  const variants = {
    primary: 'bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-900/30',
    secondary: 'bg-gray-700 hover:bg-gray-600 text-gray-200',
    danger: 'bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    ghost: 'hover:bg-gray-800 text-gray-400 hover:text-gray-200',
    outline: 'border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white hover:bg-gray-800',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 font-medium rounded-lg
        transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
};

// Card
export const Card = ({ children, className = '', ...props }) => (
  <div className={`glass-card p-6 ${className}`} {...props}>
    {children}
  </div>
);

// Input
export const Input = ({ label, error, className = '', ...props }) => (
  <div className="space-y-1">
    {label && <label className="block text-sm font-medium text-gray-300">{label}</label>}
    <input
      className={`
        w-full px-3 py-2 bg-gray-800 border rounded-lg text-gray-100 text-sm
        placeholder-gray-500 transition-colors
        ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-700 focus:ring-primary-500'}
        focus:outline-none focus:ring-2 focus:border-transparent
        ${className}
      `}
      {...props}
    />
    {error && <p className="text-xs text-red-400">{error}</p>}
  </div>
);

// Select
export const Select = ({ label, error, children, className = '', ...props }) => (
  <div className="space-y-1">
    {label && <label className="block text-sm font-medium text-gray-300">{label}</label>}
    <select
      className={`
        w-full px-3 py-2 bg-gray-800 border rounded-lg text-gray-100 text-sm
        transition-colors cursor-pointer
        ${error ? 'border-red-500' : 'border-gray-700 focus:ring-primary-500'}
        focus:outline-none focus:ring-2 focus:border-transparent
        ${className}
      `}
      {...props}
    >
      {children}
    </select>
    {error && <p className="text-xs text-red-400">{error}</p>}
  </div>
);

// Badge
export const Badge = ({ children, variant = 'gray' }) => (
  <span className={`badge badge-${variant}`}>{children}</span>
);

// Spinner
export const Spinner = ({ size = 20, className = '' }) => (
  <Loader2 size={size} className={`animate-spin text-primary-400 ${className}`} />
);

// Loading screen
export const LoadingScreen = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-950">
    <div className="text-center">
      <Spinner size={40} className="mx-auto mb-4" />
      <p className="text-gray-400 text-sm">Carregando...</p>
    </div>
  </div>
);

// Empty state
export const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="text-center py-16">
    {Icon && <Icon size={48} className="mx-auto mb-4 text-gray-600" />}
    <h3 className="text-lg font-medium text-gray-300 mb-2">{title}</h3>
    {description && <p className="text-gray-500 text-sm mb-6">{description}</p>}
    {action}
  </div>
);

// Modal
export const Modal = ({ open, onClose, title, children, maxWidth = 'max-w-lg' }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full ${maxWidth} animate-slide-up max-h-[90vh] flex flex-col`}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
              ✕
            </button>
          </div>
        )}
        <div className="overflow-y-auto flex-1 p-6">{children}</div>
      </div>
    </div>
  );
};

// Stat Card
export const StatCard = ({ title, value, icon: Icon, iconColor = 'text-primary-400', change, subtitle }) => (
  <Card className="relative overflow-hidden">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-sm text-gray-400 mb-1">{title}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        {change !== undefined && (
          <p className={`text-xs mt-1 font-medium ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
          </p>
        )}
      </div>
      {Icon && (
        <div className={`p-3 rounded-xl bg-gray-800 ${iconColor}`}>
          <Icon size={22} />
        </div>
      )}
    </div>
    <div className="absolute -bottom-4 -right-4 opacity-5">
      {Icon && <Icon size={80} />}
    </div>
  </Card>
);

// Page header
export const PageHeader = ({ title, subtitle, action }) => (
  <div className="flex items-start justify-between mb-6">
    <div>
      <h1 className="text-2xl font-bold text-white">{title}</h1>
      {subtitle && <p className="text-gray-400 text-sm mt-1">{subtitle}</p>}
    </div>
    {action}
  </div>
);

// Search input
export const SearchInput = ({ value, onChange, placeholder = 'Buscar...', className = '' }) => (
  <div className={`relative ${className}`}>
    <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
    />
  </div>
);

// Pagination
export const Pagination = ({ page, total, limit, onPageChange }) => {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
      <p className="text-xs text-gray-500">
        {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} de {total} registros
      </p>
      <div className="flex gap-2">
        <Button size="sm" variant="ghost" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>‹</Button>
        <span className="text-sm text-gray-400 px-2 py-1">{page} / {totalPages}</span>
        <Button size="sm" variant="ghost" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>›</Button>
      </div>
    </div>
  );
};
