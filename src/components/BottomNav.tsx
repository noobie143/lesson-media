import React from 'react';
import { Compass, Gamepad2, Award, User } from 'lucide-react';
import { soundEngine } from '../utils/audio';

export type NavTab = 'learn' | 'play' | 'rewards' | 'profile';

interface BottomNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onSelectTab }) => {
  const tabs = [
    {
      id: 'learn' as NavTab,
      labelTe: 'నేర్చుకో',
      labelEn: 'Learn',
      icon: Compass,
    },
    {
      id: 'play' as NavTab,
      labelTe: 'ఆటలు',
      labelEn: 'Play',
      icon: Gamepad2,
    },
    {
      id: 'rewards' as NavTab,
      labelTe: 'బహుమతులు',
      labelEn: 'Rewards',
      icon: Award,
    },
    {
      id: 'profile' as NavTab,
      labelTe: 'ప్రొఫైల్',
      labelEn: 'Profile',
      icon: User,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#10452F]/15 shadow-[0_-4px_12px_rgba(0,0,0,0.04)] pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
      <div className="max-w-md mx-auto px-4 flex items-center justify-around gap-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                soundEngine.playClick();
                onSelectTab(tab.id);
              }}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 min-h-[52px] rounded-2xl transition-all duration-150 select-none ${
                isActive
                  ? 'bg-[#DDF5E8] text-[#155D3B] font-bold shadow-[0_2px_0_#155D3B]'
                  : 'text-[#404942] hover:bg-[#F7F3E8] font-medium'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center transition-transform ${
                  isActive ? 'scale-110' : 'scale-100'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px] text-[#155D3B]' : 'text-[#707971]'}`} />
              </div>
              <span className="text-[12px] font-telugu leading-tight mt-0.5">
                {tab.labelTe}
              </span>
              <span className="text-[10px] text-[#707971] leading-none">
                {tab.labelEn}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
