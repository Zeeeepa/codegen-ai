/**
 * Navigation Component
 * Provides navigation between different views and features
 */

import React from 'react';
import { Button, Badge } from './ui';
import { 
  HomeIcon, 
  PlayIcon, 
  BuildingIcon, 
  SettingsIcon,
  BellIcon,
  UserIcon
} from './icons';

export type NavigationView = 'projects' | 'agent-runs' | 'organizations' | 'settings';

interface NavigationProps {
  currentView: NavigationView;
  onViewChange: (view: NavigationView) => void;
  organizationName?: string;
  unreadNotifications?: number;
  userName?: string;
  userAvatar?: string;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentView,
  onViewChange,
  organizationName,
  unreadNotifications = 0,
  userName,
  userAvatar
}) => {
  const navigationItems = [
    {
      id: 'projects' as NavigationView,
      label: 'Projects',
      icon: HomeIcon,
      description: 'Manage your GitHub projects'
    },
    {
      id: 'agent-runs' as NavigationView,
      label: 'Agent Runs',
      icon: PlayIcon,
      description: 'View and manage agent executions'
    },
    {
      id: 'organizations' as NavigationView,
      label: 'Organizations',
      icon: BuildingIcon,
      description: 'Switch between organizations'
    }
  ];

  return (
    <nav className="bg-gray-800 border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Organization */}
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-white">Codegen AI</h1>
            </div>
            {organizationName && (
              <div className="hidden md:block">
                <Badge variant="secondary" className="bg-gray-700 text-gray-300">
                  {organizationName}
                </Badge>
              </div>
            )}
          </div>

          {/* Navigation Items */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => onViewChange(item.id)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                    title={item.description}
                  >
                    <div className="flex items-center space-x-2">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right side - Notifications, Settings, User */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <button
              className="relative p-2 text-gray-400 hover:text-white transition-colors"
              title="Notifications"
            >
              <BellIcon className="w-5 h-5" />
              {unreadNotifications > 0 && (
                <Badge 
                  className="absolute -top-1 -right-1 bg-red-500 text-white text-xs min-w-[1.25rem] h-5 flex items-center justify-center"
                >
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </Badge>
              )}
            </button>

            {/* Settings */}
            <button
              onClick={() => onViewChange('settings')}
              className={`p-2 rounded-md transition-colors ${
                currentView === 'settings'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
              title="Settings"
            >
              <SettingsIcon className="w-5 h-5" />
            </button>

            {/* User Profile */}
            <div className="flex items-center space-x-3">
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt={userName || 'User'}
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                  <UserIcon className="w-4 h-4 text-gray-300" />
                </div>
              )}
              {userName && (
                <span className="hidden lg:block text-sm text-gray-300">
                  {userName}
                </span>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              type="button"
              className="bg-gray-800 inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
              aria-controls="mobile-menu"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className="md:hidden" id="mobile-menu">
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-700">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  isActive
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </div>
              </button>
            );
          })}
          
          {/* Mobile Settings */}
          <button
            onClick={() => onViewChange('settings')}
            className={`w-full text-left px-3 py-2 rounded-md text-base font-medium transition-colors ${
              currentView === 'settings'
                ? 'bg-gray-900 text-white'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-3">
              <SettingsIcon className="w-5 h-5" />
              <span>Settings</span>
            </div>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;

