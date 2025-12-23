/**
 * Sync Status Indicator Component
 * 
 * Displays the current sync status with Firebase:
 * - Cloud with checkmark: All synced
 * - Cloud with spinner: Syncing in progress
 * - Cloud with offline icon: Offline mode
 * - Cloud with warning: Sync failed
 */

import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { HybridStorageService } from '../../services/hybridStorageService';

// Cast motion.div to any to fix type errors (same pattern as App.tsx)
const MotionDiv = motion.div as any;

interface SyncStatusIndicatorProps {
    showLabel?: boolean;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
    showLabel = false,
    size = 'md',
    className = '',
}) => {
    const [syncStatus, setSyncStatus] = useState({
        pending: 0,
        isOnline: true,
    });
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        // Initial status
        setSyncStatus(HybridStorageService.getOverallSyncStatus());

        // Listen for sync status changes
        const handleSyncStatusChange = (event: CustomEvent) => {
            setSyncStatus(event.detail);
            if (event.detail.pending === 0) {
                setIsSyncing(false);
            }
        };

        window.addEventListener('syncStatusChanged', handleSyncStatusChange as EventListener);

        return () => {
            window.removeEventListener('syncStatusChanged', handleSyncStatusChange as EventListener);
        };
    }, []);

    const handleManualSync = async () => {
        if (!syncStatus.isOnline || syncStatus.pending === 0) return;

        setIsSyncing(true);
        try {
            await HybridStorageService.syncPending();
        } finally {
            setIsSyncing(false);
        }
    };

    const iconSize = {
        sm: 16,
        md: 20,
        lg: 24,
    }[size];

    const getStatusConfig = () => {
        if (!syncStatus.isOnline) {
            return {
                icon: CloudOff,
                color: 'text-gray-400',
                bgColor: 'bg-gray-500/10',
                label: 'Offline',
                description: 'Working in offline mode',
            };
        }

        if (isSyncing) {
            return {
                icon: Loader2,
                color: 'text-blue-400',
                bgColor: 'bg-blue-500/10',
                label: 'Syncing...',
                description: 'Syncing your data',
                animate: true,
            };
        }

        if (syncStatus.pending > 0) {
            return {
                icon: Cloud,
                color: 'text-amber-400',
                bgColor: 'bg-amber-500/10',
                label: `${syncStatus.pending} pending`,
                description: 'Click to sync now',
                clickable: true,
            };
        }

        return {
            icon: Cloud,
            color: 'text-emerald-400',
            bgColor: 'bg-emerald-500/10',
            label: 'Synced',
            description: 'All data is synced',
            showCheck: true,
        };
    };

    const config = getStatusConfig();
    const Icon = config.icon;

    return (
        <MotionDiv
            className={`relative flex items-center gap-2 ${className}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
        >
            <button
                onClick={config.clickable ? handleManualSync : undefined}
                disabled={!config.clickable}
                className={`
          relative flex items-center justify-center
          p-2 rounded-full transition-all duration-200
          ${config.bgColor}
          ${config.clickable ? 'cursor-pointer hover:opacity-80 active:scale-95' : 'cursor-default'}
        `}
                title={config.description}
            >
                <Icon
                    size={iconSize}
                    className={`${config.color} ${config.animate ? 'animate-spin' : ''}`}
                />

                {/* Checkmark overlay for synced state */}
                <AnimatePresence>
                    {config.showCheck && (
                        <MotionDiv
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            className="absolute -bottom-0.5 -right-0.5"
                        >
                            <div className="bg-emerald-500 rounded-full p-0.5">
                                <Check size={8} className="text-white" strokeWidth={3} />
                            </div>
                        </MotionDiv>
                    )}
                </AnimatePresence>

                {/* Pending count badge */}
                <AnimatePresence>
                    {syncStatus.pending > 0 && !isSyncing && (
                        <MotionDiv
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            className="absolute -top-1 -right-1"
                        >
                            <div className="bg-amber-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                                {syncStatus.pending}
                            </div>
                        </MotionDiv>
                    )}
                </AnimatePresence>
            </button>

            {/* Label */}
            {showLabel && (
                <span className={`text-sm ${config.color}`}>
                    {config.label}
                </span>
            )}
        </MotionDiv>
    );
};

export default SyncStatusIndicator;
