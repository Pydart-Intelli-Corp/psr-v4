'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useDongle } from '@/contexts/DongleContext';
import { useTheme } from '@/contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { StatusMessage } from '@/components/management';
import {
  Activity,
  Droplet,
  Thermometer,
  Beaker,
  FlaskConical,
  Play,
  Check,
  X,
  Droplets,
  Scale,
  User,
  Clock,
  TrendingUp,
  Award,
  AlertTriangle,
  RefreshCw,
  Settings,
  ChevronLeft,
  ChevronRight,
  Bluetooth,
  BluetoothOff,
  Gauge,
  Timer,
  BarChart3,
  FileText,
  History,
  Usb,
  Zap,
  Waves,
  Monitor,
  HelpCircle,
  Search,
  MoreVertical,
  ChevronDown,
  Shield,
  Cpu
} from 'lucide-react';

// ============================================
// Types
// ============================================
interface MilkReading {
  milkType: 'cow' | 'buffalo' | 'mixed';
  fat: number;
  snf: number;
  clr: number;
  protein: number;
  lactose: number;
  salt: number;
  water: number;
  temperature: number;
  farmerId: string;
  quantity: number;
  totalAmount: number;
  rate: number;
  incentive: number;
  machineId: string;
  timestamp: Date;
  shift?: 'MR' | 'EV';
}

interface MachineConnection {
  id: string;
  machineId: string;
  machineName: string;
  isConnected: boolean;
  lastActivity?: Date;
  signalStrength?: 'excellent' | 'good' | 'weak' | 'poor';
}

interface TodayStats {
  totalTests: number;
  totalQuantity: number;
  totalAmount: number;
  avgFat: number;
  avgSnf: number;
  highestFat: number;
  lowestFat: number;
  highestSnf: number;
  lowestSnf: number;
  bestReading?: MilkReading;
  worstReading?: MilkReading;
}

interface ControlPanelDialogProps {
  isOpen: boolean;
  onClose: () => void;
  machineDbId: string;
  initialMachineId?: string;
}

const emptyReading: MilkReading = {
  milkType: 'cow', fat: 0.0, snf: 0.0, clr: 0.0, protein: 0.0, lactose: 0.0,
  salt: 0.0, water: 0.0, temperature: 0.0, farmerId: '0', quantity: 0.0,
  totalAmount: 0.0, rate: 0.0, incentive: 0.0, machineId: '0', timestamp: new Date(),
};

// ============================================
// Parser Functions (unchanged logic)
// ============================================
function extractValue(part: string, prefix: string): string {
  return part.replace(prefix, '');
}

function parseDoubleValue(value: string): number {
  try {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0.0 : parsed;
  } catch { return 0.0; }
}

function parseLactosureData(rawData: string): MilkReading | null {
  try {
    const cleanData = rawData.replace(/\^@|\r|\n|[\x00-\x1F\x7F]/g, '').trim();
    const parts = cleanData.split('|');
    if (parts.length < 16) return null;

    let readingTimestamp = new Date();
    if (parts.length > 17) {
      try {
        const timestampStr = extractValue(parts[17], 'D');
        const cleanTimestamp = timestampStr.replace('_', 'T');
        const parsed = new Date(cleanTimestamp);
        if (!isNaN(parsed.getTime())) readingTimestamp = parsed;
      } catch {}
    }

    const chValue = extractValue(parts[2], 'CH');
    let milkType: 'cow' | 'buffalo' | 'mixed' = 'cow';
    if (chValue === '2') milkType = 'buffalo';
    else if (chValue === '3') milkType = 'mixed';

    return {
      milkType,
      fat: parseDoubleValue(extractValue(parts[3], 'F')),
      snf: parseDoubleValue(extractValue(parts[4], 'S')),
      clr: parseDoubleValue(extractValue(parts[5], 'C')),
      protein: parseDoubleValue(extractValue(parts[6], 'P')),
      lactose: parseDoubleValue(extractValue(parts[7], 'L')),
      salt: parseDoubleValue(extractValue(parts[8], 's')),
      water: parseDoubleValue(extractValue(parts[9], 'W')),
      temperature: parseDoubleValue(extractValue(parts[10], 'T')),
      farmerId: extractValue(parts[11], 'I'),
      quantity: parseDoubleValue(extractValue(parts[12], 'Q')),
      totalAmount: parseDoubleValue(extractValue(parts[13], 'R')),
      rate: parseDoubleValue(extractValue(parts[14], 'r')),
      incentive: parseDoubleValue(extractValue(parts[15], 'i')),
      machineId: parts.length > 16 ? extractValue(parts[16], 'MM') : '0',
      timestamp: readingTimestamp,
    };
  } catch { return null; }
}

// ============================================
// Main Component
// ============================================
export default function ControlPanelDialog({ isOpen, onClose, machineDbId, initialMachineId }: ControlPanelDialogProps) {
  // Theme
  const { theme } = useTheme();
  const  isDark = theme === 'dark';
  
  // Machine state
  const [machine, setMachine] = useState<MachineConnection | null>(null);
  const [connectedMachines, setConnectedMachines] = useState<MachineConnection[]>([]);
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(initialMachineId || null);

  // Reading state
  const [machineReadings, setMachineReadings] = useState<Map<string, MilkReading>>(new Map());
  const [machineReadingHistory, setMachineReadingHistory] = useState<Map<string, MilkReading[]>>(new Map());
  const [isViewingHistory, setIsViewingHistory] = useState(false);
  const [historyIndex, setHistoryIndex] = useState(0);
  const MAX_HISTORY_POINTS = 20;

  // Test state
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testElapsedSeconds, setTestElapsedSeconds] = useState(0);
  const [selectedChannel, setSelectedChannel] = useState<'CH1' | 'CH2' | 'CH3'>('CH1');
  const [currentTestMachines, setCurrentTestMachines] = useState<string[]>([]);
  const [machinesWithDataReceived, setMachinesWithDataReceived] = useState<Set<string>>(new Set());

  // Machine modes
  const [machineWeighingScaleMode, setMachineWeighingScaleMode] = useState<Map<string, boolean>>(new Map());
  const [machineFarmerIdMode, setMachineFarmerIdMode] = useState<Map<string, boolean>>(new Map());
  const [machineFarmerIds, setMachineFarmerIds] = useState<Map<string, string>>(new Map());
  const [machineWeights, setMachineWeights] = useState<Map<string, string>>(new Map());

  // Dialog states
  const [showFarmerIdDialog, setShowFarmerIdDialog] = useState(false);
  const [showWeightDialog, setShowWeightDialog] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [pendingTestMachines, setPendingTestMachines] = useState<string[]>([]);

  // Today's statistics
  const [todayStats, setTodayStats] = useState<TodayStats>({
    totalTests: 0, totalQuantity: 0, totalAmount: 0,
    avgFat: 0, avgSnf: 0, highestFat: 0, lowestFat: 0, highestSnf: 0, lowestSnf: 0,
  });

  // Loading states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dongle context
  const {
    connectedPort, isDongleVerified, connectedBLEMachines,
    sendDongleCommand, onBleData, offBleData,
  } = useDongle();

  // Refs
  const testTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingFarmerIdsRef = useRef<Map<string, string>>(new Map());
  const [mounted, setMounted] = useState(false);

  // Cache management constants
  const CACHE_KEYS = {
    MACHINE_READINGS: 'psr_machine_readings',
    READING_HISTORY: 'psr_reading_history',
    TODAY_STATS: 'psr_today_stats',
    MACHINE_DATA: 'psr_machine_data',
    CONNECTED_MACHINES: 'psr_connected_machines',
    LAST_CACHE_DATE: 'psr_last_cache_date',
    CACHE_EXPIRY_HOURS: 24 // Cache expires after 24 hours
  };

  // Cache management functions
  const saveToCache = useCallback((key: string, data: any) => {
    try {
      if (typeof window !== 'undefined') {
        const cacheData = {
          data,
          timestamp: new Date().toISOString(),
          date: new Date().toDateString()
        };
        localStorage.setItem(key, JSON.stringify(cacheData));
        console.log(`Cache Debug - Saved ${key}:`, data);
      }
    } catch (error) {
      console.error('Failed to save to cache:', key, error);
    }
  }, []);

  const loadFromCache = useCallback((key: string) => {
    try {
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem(key);
        if (cached) {
          const parsedCache = JSON.parse(cached);
          const cacheDate = new Date(parsedCache.timestamp);
          const now = new Date();
          const hoursDiff = (now.getTime() - cacheDate.getTime()) / (1000 * 60 * 60);
          
          // Check if cache is still valid (within expiry hours)
          if (hoursDiff < CACHE_KEYS.CACHE_EXPIRY_HOURS) {
            console.log(`Cache Debug - Loaded ${key} (${hoursDiff.toFixed(1)}h old):`, parsedCache.data);
            return parsedCache.data;
          } else {
            console.log(`Cache Debug - Expired cache for ${key} (${hoursDiff.toFixed(1)}h old), removing`);
            localStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load from cache:', key, error);
    }
    return null;
  }, []);

  const clearTodayCache = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        const today = new Date().toDateString();
        const lastCacheDate = localStorage.getItem(CACHE_KEYS.LAST_CACHE_DATE);
        
        if (lastCacheDate && lastCacheDate !== today) {
          // Clear today's cache if it's a new day
          localStorage.removeItem(CACHE_KEYS.TODAY_STATS);
          localStorage.setItem(CACHE_KEYS.LAST_CACHE_DATE, today);
          console.log('Cache Debug - Cleared today cache for new day');
        }
      }
    } catch (error) {
      console.error('Failed to clear today cache:', error);
    }
  }, []);

  const serializeMapForCache = useCallback((map: Map<any, any>) => {
    return Array.from(map.entries());
  }, []);

  const deserializeMapFromCache = useCallback((serialized: any[]): Map<any, any> => {
    return new Map(serialized);
  }, []);

  // Add function to manually clear all cache
  const clearAllCache = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        Object.values(CACHE_KEYS).forEach(key => {
          if (typeof key === 'string') {
            localStorage.removeItem(key);
          }
        });
        console.log('Cache Debug - All cache cleared manually');
        
        // Reset states to initial values
        setMachineReadings(new Map());
        setMachineReadingHistory(new Map());
        setTodayStats({
          totalTests: 0, totalQuantity: 0, totalAmount: 0,
          avgFat: 0, avgSnf: 0, highestFat: 0, lowestFat: 0, highestSnf: 0, lowestSnf: 0,
        });
      }
    } catch (error) {
      console.error('Failed to clear all cache:', error);
    }
  }, []);

  // Combined function to clear all live data (readings + trend history + cache)
  const clearAllLiveData = useCallback(() => {
    try {
      // Clear current readings
      setMachineReadings(new Map());
      
      // Clear trend history
      setMachineReadingHistory(new Map());
      
      // Clear relevant cache entries
      if (typeof window !== 'undefined') {
        localStorage.removeItem(CACHE_KEYS.MACHINE_READINGS);
        localStorage.removeItem(CACHE_KEYS.READING_HISTORY);
        console.log('Cache Debug - Cleared live data cache');
      }
      
      console.log('Live Data Debug - Cleared all current readings and trend history');
    } catch (error) {
      console.error('Failed to clear live data:', error);
    }
  }, []);

  // Function to clear only current readings (not cache or history)
  const clearCurrentReadingsOnly = useCallback(() => {
    try {
      // Clear only current readings - this affects Current Readings and Transaction display
      setMachineReadings(new Map());
      
      // Note: Cache and trend history are preserved
      console.log('Live Data Debug - Cleared current readings only (cache and history preserved)');
      setSuccess('Current readings cleared');
    } catch (error) {
      console.error('Failed to clear current readings:', error);
      setError('Failed to clear readings');
    }
  }, []);

  // Helper function to filter only today's readings
  const filterTodayReadings = useCallback((readings: MilkReading[]): MilkReading[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return readings.filter(reading => {
      const readingDate = new Date(reading.timestamp);
      readingDate.setHours(0, 0, 0, 0);
      return readingDate.getTime() === today.getTime();
    });
  }, []);

  const calculateTodayStats = useCallback((readings: MilkReading[]) => {
    if (readings.length === 0) {
      setTodayStats({ totalTests: 0, totalQuantity: 0, totalAmount: 0, avgFat: 0, avgSnf: 0, highestFat: 0, lowestFat: 0, highestSnf: 0, lowestSnf: 0 });
      return;
    }
    let sumFat = 0, sumSnf = 0, sumQuantity = 0, sumAmount = 0;
    let maxFat = 0, minFat = Infinity, maxSnf = 0, minSnf = Infinity;
    
    console.log(`Today Stats Debug - Processing ${readings.length} readings:`);
    readings.forEach((r, index) => {
      console.log(`  Reading ${index + 1}: qty=${r.quantity}, amount=${r.totalAmount}, fat=${r.fat}, snf=${r.snf}`);
      sumFat += r.fat; sumSnf += r.snf; sumQuantity += r.quantity; sumAmount += r.totalAmount;
      maxFat = Math.max(maxFat, r.fat); minFat = Math.min(minFat, r.fat);
      maxSnf = Math.max(maxSnf, r.snf); minSnf = Math.min(minSnf, r.snf);
    });
    
    console.log(`Today Stats Debug - Totals: tests=${readings.length}, qty=${sumQuantity}, amount=${sumAmount}`);
    
    setTodayStats({
      totalTests: readings.length, totalQuantity: sumQuantity, totalAmount: sumAmount,
      avgFat: sumFat / readings.length, avgSnf: sumSnf / readings.length,
      highestFat: maxFat, lowestFat: minFat === Infinity ? 0 : minFat,
      highestSnf: maxSnf, lowestSnf: minSnf === Infinity ? 0 : minSnf,
    });
  }, []);

  useEffect(() => {
    setMounted(true);
    
    // Clear old cache if it's a new day
    clearTodayCache();
    
    // Load cached data on mount
    const loadCachedData = async () => {
      try {
        // Load machine readings
        const cachedReadings = loadFromCache(CACHE_KEYS.MACHINE_READINGS);
        if (cachedReadings) {
          setMachineReadings(deserializeMapFromCache(cachedReadings));
        }

        // Load reading history
        const cachedHistory = loadFromCache(CACHE_KEYS.READING_HISTORY);
        if (cachedHistory) {
          // Deserialize nested structure: Map<string, MilkReading[]>
          const historyMap = new Map();
          const allReadings: MilkReading[] = [];
          cachedHistory.forEach(([key, readings]: [string, MilkReading[]]) => {
            // Convert timestamp strings back to Date objects
            const processedReadings = readings.map(reading => ({
              ...reading,
              timestamp: new Date(reading.timestamp)
            }));
            historyMap.set(key, processedReadings);
            allReadings.push(...processedReadings);
          });
          setMachineReadingHistory(historyMap);
          
          // Calculate today's stats from cached history
          const todayReadings = filterTodayReadings(allReadings);
          if (todayReadings.length > 0) {
            calculateTodayStats(todayReadings);
            console.log(`Cache Debug - Recalculated today's stats from ${todayReadings.length} cached today's readings`);
          }
        }

        // Load today's stats (fallback if no history available)
        const cachedStats = loadFromCache(CACHE_KEYS.TODAY_STATS);
        if (cachedStats && !cachedHistory) {
          setTodayStats(cachedStats);
        }

        // Load machine data
        const cachedMachine = loadFromCache(CACHE_KEYS.MACHINE_DATA);
        if (cachedMachine) {
          setMachine({
            ...cachedMachine,
            lastActivity: cachedMachine.lastActivity ? new Date(cachedMachine.lastActivity) : undefined
          });
        }

        // Load connected machines
        const cachedConnectedMachines = loadFromCache(CACHE_KEYS.CONNECTED_MACHINES);
        if (cachedConnectedMachines) {
          const processedMachines = cachedConnectedMachines.map((m: any) => ({
            ...m,
            lastActivity: m.lastActivity ? new Date(m.lastActivity) : undefined
          }));
          setConnectedMachines(processedMachines);
        }

        console.log('Cache Debug - All cached data loaded successfully');
      } catch (error) {
        console.error('Failed to load cached data:', error);
      }
    };

    loadCachedData();
    return () => setMounted(false);
  }, [clearTodayCache, loadFromCache, deserializeMapFromCache, filterTodayReadings, calculateTodayStats]);

  // Save readings to cache when they change
  useEffect(() => {
    if (mounted && machineReadings.size > 0) {
      saveToCache(CACHE_KEYS.MACHINE_READINGS, serializeMapForCache(machineReadings));
    }
  }, [machineReadings, saveToCache, serializeMapForCache, mounted]);

  // Save reading history to cache when it changes
  useEffect(() => {
    if (mounted && machineReadingHistory.size > 0) {
      saveToCache(CACHE_KEYS.READING_HISTORY, serializeMapForCache(machineReadingHistory));
    }
  }, [machineReadingHistory, saveToCache, serializeMapForCache, mounted]);

  // Save today's stats to cache when they change
  useEffect(() => {
    if (mounted && todayStats.totalTests > 0) {
      saveToCache(CACHE_KEYS.TODAY_STATS, todayStats);
    }
  }, [todayStats, saveToCache, mounted]);

  // Save machine data to cache when it changes
  useEffect(() => {
    if (mounted && machine) {
      saveToCache(CACHE_KEYS.MACHINE_DATA, machine);
    }
  }, [machine, saveToCache, mounted]);

  // Save connected machines to cache when they change
  useEffect(() => {
    if (mounted && connectedMachines.length > 0) {
      saveToCache(CACHE_KEYS.CONNECTED_MACHINES, connectedMachines);
    }
  }, [connectedMachines, saveToCache, mounted]);

  const extractNumericId = useCallback((machineId: string | undefined): string | null => {
    if (!machineId) return null;
    const numericId = machineId.replace(/[^0-9]/g, '').replace(/^0+/, '');
    return numericId || null;
  }, []);

  // For testing - generate sample trend data
  const generateSampleTrendData = useCallback(() => {
    const sampleData: MilkReading[] = [];
    const now = new Date();
    for (let i = 0; i < 10; i++) {
      const timestamp = new Date(now.getTime() - (i * 60000)); // Every minute going back
      sampleData.unshift({
        milkType: 'cow' as const,
        fat: 3.5 + Math.random() * 1.5, // 3.5-5.0
        snf: 8.0 + Math.random() * 2.0, // 8.0-10.0
        clr: 30 + Math.random() * 5,
        protein: 3.2 + Math.random() * 0.5,
        lactose: 4.5 + Math.random() * 0.3,
        salt: 0.7 + Math.random() * 0.1,
        water: 87.0 + Math.random() * 1.0,
        temperature: 35 + Math.random() * 3,
        farmerId: '1001',
        quantity: 500 + Math.random() * 200,
        totalAmount: 45 + Math.random() * 15,
        rate: 45 + Math.random() * 5,
        incentive: 2 + Math.random() * 3,
        machineId: selectedMachineId || '1',
        timestamp: timestamp,
        shift: 'MR' as const
      });
    }
    
    const machineId = selectedMachineId || '1';
    console.log(`Trend Debug - Generating ${sampleData.length} sample readings for machine ${machineId}`);
    setMachineReadingHistory(prev => {
      const newHistory = new Map(prev);
      newHistory.set(machineId, sampleData);
      return newHistory;
    });
  }, [selectedMachineId]);

  const sendToAllMachines = useCallback(async (hexCommand: string): Promise<boolean> => {
    if (connectedPort && isDongleVerified) {
      return await sendDongleCommand(`SENDHEXALL,${hexCommand}`);
    }
    setError('No dongle connected. Connect from Machine Management first.');
    return false;
  }, [connectedPort, isDongleVerified, sendDongleCommand]);

  const normalizeId = useCallback((id: string): string => {
    return id.replace(/^[Mm]+/, '').replace(/^0+/, '') || '0';
  }, []);

  // BLE data subscription
  useEffect(() => {
    if (!isOpen) return;
    const handleBleData = (machineId: string, data: string) => {
      const parsed = parseLactosureData(data);
      if (!parsed) return;

      const storageKey = normalizeId(machineId);
      const readingWithMachine = { ...parsed, machineId: storageKey };

      setMachineReadings(prev => {
        const newMap = new Map(prev);
        newMap.set(storageKey, readingWithMachine);
        return newMap;
      });

      if (!selectedMachineId) setSelectedMachineId(storageKey);

      setMachineReadingHistory(prev => {
        const newHistory = new Map(prev);
        const machineHistory = newHistory.get(storageKey) || [];
        const updatedHistory = [...machineHistory, readingWithMachine];
        if (updatedHistory.length > MAX_HISTORY_POINTS) updatedHistory.shift();
        newHistory.set(storageKey, updatedHistory);
        console.log(`Trend Debug - Adding reading to machine ${storageKey}, total history: ${updatedHistory.length}`);
        
        // Calculate today's stats from all machines' today's readings (cached + live)
        const allReadings: MilkReading[] = [];
        newHistory.forEach(readings => allReadings.push(...readings));
        const todayReadings = filterTodayReadings(allReadings);
        calculateTodayStats(todayReadings);
        
        return newHistory;
      });

      if (isTestRunning && currentTestMachines.length > 0) {
        for (const testMachine of currentTestMachines) {
          const normalizedTest = normalizeId(testMachine);
          if (normalizedTest === storageKey || testMachine === storageKey) {
            setMachinesWithDataReceived(prev => {
              const newSet = new Set(prev);
              newSet.add(testMachine);
              if (newSet.size >= currentTestMachines.length && currentTestMachines.length > 0) {
                handleStopTest();
                setSuccess(`Test Complete: All ${currentTestMachines.length} machine(s) received data! FAT ${parsed.fat.toFixed(2)}%, SNF ${parsed.snf.toFixed(2)}%`);
              }
              return newSet;
            });
            break;
          }
        }
      } else {
        if (parsed.fat > 0 || parsed.snf > 0) {
          setSuccess(`Data received from M${storageKey}: FAT ${parsed.fat.toFixed(1)}% | SNF ${parsed.snf.toFixed(1)}% | CLR ${parsed.clr.toFixed(1)}`);
        }
      }
    };
    onBleData(handleBleData);
    return () => offBleData(handleBleData);
  }, [isOpen, selectedMachineId, onBleData, offBleData, isTestRunning, currentTestMachines, normalizeId, filterTodayReadings, calculateTodayStats]);

  // Update connected machines
  useEffect(() => {
    if (!isOpen) return;
    const bleConnected: MachineConnection[] = Array.from(connectedBLEMachines).map(machineId => ({
      id: machineId, machineId, machineName: `Machine M-${machineId}`,
      isConnected: true, signalStrength: 'excellent' as const,
    }));
    if (machine) {
      const apiMachineNumericId = extractNumericId(machine.machineId);
      const existsInBle = bleConnected.some(m => m.machineId === apiMachineNumericId);
      if (!existsInBle && apiMachineNumericId) {
        bleConnected.unshift({
          id: machine.id, machineId: apiMachineNumericId,
          machineName: machine.machineName,
          isConnected: connectedBLEMachines.has(apiMachineNumericId),
          signalStrength: connectedBLEMachines.has(apiMachineNumericId) ? 'excellent' : 'poor',
        });
      }
    }
    if (bleConnected.length > 0) setConnectedMachines(bleConnected);
    if (!selectedMachineId && bleConnected.length > 0) {
      const apiMachineNumericId = extractNumericId(machine?.machineId);
      if (apiMachineNumericId && connectedBLEMachines.has(apiMachineNumericId)) {
        setSelectedMachineId(apiMachineNumericId);
      } else if (bleConnected.length > 0) {
        setSelectedMachineId(bleConnected[0].machineId);
      }
    }
  }, [isOpen, connectedBLEMachines, selectedMachineId, machine, extractNumericId]);

  // Fetch machine details
  const fetchMachineDetails = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      if (!token) { setLoading(false); return; }

      const response = await fetch(`/api/user/machine?id=${machineDbId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const fallbackMachine: MachineConnection = {
          id: machineDbId, machineId: isNaN(parseInt(machineDbId, 10)) ? machineDbId : `M-${machineDbId}`,
          machineName: `Machine M-${machineDbId}`,
          isConnected: connectedBLEMachines.has(machineDbId) || connectedBLEMachines.has(machineDbId.replace(/^0+/, '')),
          signalStrength: 'excellent'
        };
        setMachine(fallbackMachine);
        setConnectedMachines(prev => prev.length > 0 ? prev : [fallbackMachine]);
        if (!selectedMachineId) setSelectedMachineId(machineDbId.replace(/^0+/, '') || machineDbId);
        setLoading(false);
        return;
      }

      const result = await response.json();
      if (result.success && result.data?.[0]) {
        const machineData = result.data[0];
        const machineConnection: MachineConnection = {
          id: machineDbId, machineId: machineData.machineId,
          machineName: `Machine ${machineData.machineId}`,
          isConnected: machineData.status === 'active',
          lastActivity: machineData.lastActivity ? new Date(machineData.lastActivity) : undefined,
          signalStrength: 'excellent'
        };
        setMachine(machineConnection);
        setConnectedMachines([machineConnection]);
        await fetchMachineReadings(machineData.machineId, token);
      } else {
        const fallbackMachine: MachineConnection = {
          id: machineDbId, machineId: `M-${machineDbId}`,
          machineName: `Machine M-${machineDbId}`,
          isConnected: connectedBLEMachines.has(machineDbId) || connectedBLEMachines.has(machineDbId.replace(/^0+/, '')),
          signalStrength: 'excellent'
        };
        setMachine(fallbackMachine);
        setConnectedMachines(prev => prev.length > 0 ? prev : [fallbackMachine]);
        if (!selectedMachineId) setSelectedMachineId(machineDbId.replace(/^0+/, '') || machineDbId);
      }
    } catch {
      const fallbackMachine: MachineConnection = {
        id: machineDbId, machineId: `M-${machineDbId}`,
        machineName: `Machine M-${machineDbId}`, isConnected: true, signalStrength: 'excellent'
      };
      setMachine(fallbackMachine);
      setConnectedMachines(prev => prev.length > 0 ? prev : [fallbackMachine]);
    } finally { setLoading(false); }
  }, [machineDbId, connectedBLEMachines, selectedMachineId]);

  const fetchMachineReadings = async (machineId: string, token: string) => {
    try {
      // Check if we have cached data for this machine
      const normalizedId = machineId.replace(/^[Mm]+/, '').replace(/^0+/, '') || '0';
      const cachedHistory = machineReadingHistory.get(normalizedId);
      const cacheKey = `${CACHE_KEYS.READING_HISTORY}_${normalizedId}`;
      
      // Always fetch fresh data from API for today's readings
      console.log(`Cache Debug - Fetching fresh data for machine ${machineId}`);
      const response = await fetch(`/api/user/reports/collections`, { headers: { 'Authorization': `Bearer ${token}` } });
      
      console.log(`API Debug - Response status: ${response.status}, ok: ${response.ok}`);
      
      if (response.ok) {
        const result = await response.json();
        console.log(`API Debug - Response is array: ${Array.isArray(result)}, length: ${Array.isArray(result) ? result.length : 'N/A'}`);
        
        // API returns direct array of collections, not { success: true, data: [...] }
        if (Array.isArray(result)) {
          console.log(`API Debug - Received ${result.length} total collections from API`);
          
          // Get today's date for filtering
          const today = new Date(); 
          today.setHours(0, 0, 0, 0);
          
          // Get all machine data from API
          const allMachineCollections = result
            .filter((col: any) => col.machine_id === machineId)
            .map((col: any): MilkReading => {
              console.log(`API Debug - Raw collection: machine=${col.machine_id}, qty=${col.quantity}, total_amount=${col.total_amount}, rate=${col.rate}, farmer=${col.farmer_id}`);
              return {
                milkType: col.channel?.toLowerCase() === 'buffalo' ? 'buffalo' : col.channel?.toLowerCase() === 'mixed' ? 'mixed' : 'cow',
                fat: parseFloat(col.fat) || 0, snf: parseFloat(col.snf) || 0, clr: parseFloat(col.clr) || 0,
                protein: parseFloat(col.protein) || 0, lactose: parseFloat(col.lactose) || 0,
                salt: parseFloat(col.salt) || 0, water: parseFloat(col.water) || 0,
                temperature: parseFloat(col.temperature) || 0, farmerId: col.farmer_id?.toString() || '0',
                quantity: parseFloat(col.quantity) || 0, totalAmount: parseFloat(col.total_amount) || 0,
                rate: parseFloat(col.rate) || 0, incentive: parseFloat(col.bonus) || 0,
                machineId: col.machine_id, timestamp: new Date(col.collection_date + ' ' + (col.collection_time || '00:00:00')),
                shift: col.session === 'MO' ? 'MR' : 'EV',
              };
            });
          
          console.log(`API Debug - Filtered ${allMachineCollections.length} collections for machine ${machineId}`);

          // Filter today's collections for fresh stats
          const todayCollections = allMachineCollections.filter((col: MilkReading) => {
            const colDate = new Date(col.timestamp); 
            colDate.setHours(0, 0, 0, 0);
            return colDate.getTime() === today.getTime();
          });

          // Intelligent history merging: combine fresh API data with cached historical data
          let combinedHistory: MilkReading[] = [];
          
          if (cachedHistory && cachedHistory.length > 0) {
            // Use cached historical data and add any new readings from API
            const cachedTimestamps = new Set(cachedHistory.map((r: MilkReading) => r.timestamp.getTime()));
            const newReadings = allMachineCollections.filter((r: MilkReading) => !cachedTimestamps.has(r.timestamp.getTime()));
            
            combinedHistory = [...cachedHistory, ...newReadings]
              .sort((a: MilkReading, b: MilkReading) => a.timestamp.getTime() - b.timestamp.getTime())
              .slice(-MAX_HISTORY_POINTS);
              
            console.log(`Cache Debug - Merged ${cachedHistory.length} cached + ${newReadings.length} new = ${combinedHistory.length} total readings for machine ${normalizedId}`);
          } else {
            // No cached data, use API data from last 7 days
            const sevenDaysAgo = new Date(); 
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            sevenDaysAgo.setHours(0, 0, 0, 0);
            
            combinedHistory = allMachineCollections
              .filter((col: MilkReading) => {
                const colDate = new Date(col.timestamp); 
                colDate.setHours(0, 0, 0, 0);
                return colDate.getTime() >= sevenDaysAgo.getTime();
              })
              .sort((a: MilkReading, b: MilkReading) => a.timestamp.getTime() - b.timestamp.getTime())
              .slice(-MAX_HISTORY_POINTS);
              
            console.log(`Cache Debug - No cache found, using ${combinedHistory.length} fresh readings from last 7 days for machine ${normalizedId}`);
          }
          // Update machine reading history with combined data
          if (combinedHistory.length > 0) {
            console.log(`Cache Debug - Updating history for machine ${normalizedId} with ${combinedHistory.length} readings`);
            setMachineReadingHistory(prev => {
              const newHistory = new Map(prev);
              newHistory.set(normalizedId, combinedHistory);
              return newHistory;
            });
          } else {
            // Fallback: try to get any historical data for this machine
            console.log(`Cache Debug - No recent data, checking for any historical data for machine ${machineId}`);
            const anyMachineData = result.filter((col: any) => col.machine_id === machineId);
            
            if (anyMachineData.length > 0) {
              console.log(`Cache Debug - Found ${anyMachineData.length} total records for machine ${machineId}`);
              const fallbackData = anyMachineData
                .slice(-MAX_HISTORY_POINTS)
                .map((col: any): MilkReading => ({
                  milkType: col.channel?.toLowerCase() === 'buffalo' ? 'buffalo' : col.channel?.toLowerCase() === 'mixed' ? 'mixed' : 'cow',
                  fat: parseFloat(col.fat) || 0, snf: parseFloat(col.snf) || 0, clr: parseFloat(col.clr) || 0,
                  protein: parseFloat(col.protein) || 0, lactose: parseFloat(col.lactose) || 0,
                  salt: parseFloat(col.salt) || 0, water: parseFloat(col.water) || 0,
                  temperature: parseFloat(col.temperature) || 0, farmerId: col.farmer_id?.toString() || '0',
                  quantity: parseFloat(col.quantity) || 0, totalAmount: parseFloat(col.total_amount) || 0,
                  rate: parseFloat(col.rate) || 0, incentive: parseFloat(col.bonus) || 0,
                  machineId: col.machine_id, timestamp: new Date(col.collection_date + ' ' + (col.collection_time || '00:00:00')),
                  shift: col.session === 'MO' ? 'MR' : 'EV',
                }))
                .sort((a: MilkReading, b: MilkReading) => a.timestamp.getTime() - b.timestamp.getTime());
              
              setMachineReadingHistory(prev => {
                const newHistory = new Map(prev);
                newHistory.set(normalizedId, fallbackData);
                return newHistory;
              });
            }
          }
          
          // Always calculate fresh today's stats from API data
          calculateTodayStats(todayCollections);
          console.log(`Cache Debug - Updated today's stats with ${todayCollections.length} today's readings`);
        } else {
          console.error(`API Debug - Response is not an array, type: ${typeof result}`);
        }
      } else {
        console.error(`API Debug - API request failed with status ${response.status}`);
        const errorText = await response.text();
        console.error(`API Debug - Error response: ${errorText.substring(0, 200)}`);
      }
    } catch (error) {
      console.error('API Debug - Exception fetching machine readings:', error);
    }
  };

  // Build test command (matching Flutter)
  const buildTestCommand = (channel: string, farmerId: string, weight: number): string => {
    let channelByte: number;
    switch (channel) {
      case 'CH1': channelByte = 0x00; break;
      case 'CH2': channelByte = 0x01; break;
      case 'CH3': channelByte = 0x02; break;
      default: channelByte = 0x00;
    }
    const cycleMode = 0x00;
    const farmerIdInt = parseInt(farmerId) || 1;
    const farmerIdMsb = (farmerIdInt >> 16) & 0xFF;
    const farmerIdMid = (farmerIdInt >> 8) & 0xFF;
    const farmerIdLsb = farmerIdInt & 0xFF;
    const weightInt = Math.round(weight * 100);
    const weightByte3 = (weightInt >> 24) & 0xFF;
    const weightByte2 = (weightInt >> 16) & 0xFF;
    const weightByte1 = (weightInt >> 8) & 0xFF;
    const weightByte0 = weightInt & 0xFF;
    const bytes = [0x40, 0x0B, 0x07, channelByte, cycleMode, farmerIdMsb, farmerIdMid, farmerIdLsb, weightByte3, weightByte2, weightByte1, weightByte0];
    let lrc = 0;
    bytes.forEach(b => lrc ^= b);
    bytes.push(lrc);
    return bytes.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join('');
  };

  const initiateTest = async () => {
    if (connectedBLEMachines.size === 0) { setError('No machines connected'); return; }
    const machineIds = Array.from(connectedBLEMachines.keys());
    setMachineFarmerIds(new Map());
    setMachineWeights(new Map());
    const manualFarmerIdMachines = machineIds.filter(id => !(machineFarmerIdMode.get(id) ?? false));
    const manualWeightMachines = machineIds.filter(id => !(machineWeighingScaleMode.get(id) ?? false));
    setPendingTestMachines(machineIds);
    if (manualFarmerIdMachines.length > 0) { setShowFarmerIdDialog(true); return; }
    if (manualWeightMachines.length > 0) { setShowWeightDialog(true); return; }
    await executeTest(machineIds);
  };

  const executeTest = async (machineIds: string[], farmerIds?: Map<string, string>, weights?: Map<string, string>) => {
    const finalFarmerIds = farmerIds || machineFarmerIds;
    const finalWeights = weights || machineWeights;
    setMachinesWithDataReceived(new Set());
    setCurrentTestMachines(machineIds);
    setIsTestRunning(true);
    setTestElapsedSeconds(0);
    testTimerRef.current = setInterval(() => setTestElapsedSeconds(s => s + 1), 1000);
    if (machineIds.length > 0) {
      const firstMachineId = machineIds[0];
      const farmerId = finalFarmerIds.get(firstMachineId) || '1';
      const weight = parseFloat(finalWeights.get(firstMachineId) || '1') || 1;
      const testHex = buildTestCommand(selectedChannel, farmerId, weight);
      if (sendDongleCommand) await sendDongleCommand(`SENDHEXALL,${testHex}`);
    }
    setSuccess(`Test sent to ${connectedBLEMachines.size} machine(s)!`);
  };

  const handleFarmerIdDialogComplete = (farmerIds: Map<string, string>) => {
    setMachineFarmerIds(farmerIds);
    pendingFarmerIdsRef.current = farmerIds;
    setShowFarmerIdDialog(false);
    const machineIds = Array.from(connectedBLEMachines.keys());
    const manualWeightMachines = machineIds.filter(id => !(machineWeighingScaleMode.get(id) ?? false));
    if (manualWeightMachines.length > 0) { setShowWeightDialog(true); }
    else { executeTest(pendingTestMachines, farmerIds, new Map()); }
  };

  const handleWeightDialogComplete = (weights: Map<string, string>) => {
    setMachineWeights(weights);
    setShowWeightDialog(false);
    executeTest(pendingTestMachines, pendingFarmerIdsRef.current, weights);
  };

  const handleTest = async () => { await initiateTest(); };

  const handleStopTest = () => {
    setIsTestRunning(false);
    setTestElapsedSeconds(0);
    if (testTimerRef.current) { clearInterval(testTimerRef.current); testTimerRef.current = null; }
  };

  const handleOk = async () => {
    const sent = await sendToAllMachines('400401040041');
    if (sent) setSuccess(`OK sent to ${connectedBLEMachines.size} machine(s)!`);
  };

  const handleCancel = async () => {
    const sent = await sendToAllMachines('4004010A004F');
    if (sent) setSuccess(`Cancel sent to ${connectedBLEMachines.size} machine(s)!`);
    handleStopTest();
  };

  const handleClean = async () => {
    const sent = await sendToAllMachines('400409000A47');
    if (sent) setSuccess(`Clean sent to ${connectedBLEMachines.size} machine(s)!`);
  };

  const readingHistory = useMemo((): MilkReading[] => {
    if (selectedMachineId && machineReadingHistory.has(selectedMachineId)) {
      const history = machineReadingHistory.get(selectedMachineId)!;
      console.log(`Trend Debug - Selected machine ${selectedMachineId} history:`, history.length, 'readings');
      return history;
    }
    for (const [machineId, readings] of machineReadingHistory) { 
      if (readings.length > 0) {
        console.log(`Trend Debug - Fallback machine ${machineId} history:`, readings.length, 'readings');
        return readings;
      }
    }
    console.log('Trend Debug - No readings found in any machine history');
    return [];
  }, [selectedMachineId, machineReadingHistory]);

  const goToPreviousReading = () => { if (historyIndex < readingHistory.length - 1) { setHistoryIndex(h => h + 1); setIsViewingHistory(true); } };
  const goToNextReading = () => { if (historyIndex > 0) { setHistoryIndex(h => h - 1); if (historyIndex - 1 === 0) setIsViewingHistory(false); } };
  const goToLiveReading = () => { setHistoryIndex(0); setIsViewingHistory(false); };

  const displayedReading = useMemo(() => {
    if (isViewingHistory && readingHistory.length > 0) {
      const idx = readingHistory.length - 1 - historyIndex;
      return readingHistory[Math.max(0, Math.min(idx, readingHistory.length - 1))] || emptyReading;
    }
    if (selectedMachineId && machineReadings.has(selectedMachineId)) return machineReadings.get(selectedMachineId)!;
    return emptyReading;
  }, [isViewingHistory, readingHistory, historyIndex, selectedMachineId, machineReadings]);

  const formatFarmerId = (id: string) => id.replace(/^0+/, '') || '0';
  const formatTimestamp = (date?: Date | string | number) => {
    if (!date) return '--';
    
    // Convert to Date object if it's not already
    let dateObj: Date;
    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string' || typeof date === 'number') {
      dateObj = new Date(date);
    } else {
      return '--';
    }
    
    // Check if the date is valid
    if (isNaN(dateObj.getTime())) return '--';
    
    const now = new Date();
    const isToday = dateObj.toDateString() === now.toDateString();
    const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    return isToday ? `Today ${timeStr}` : `${dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })} ${timeStr}`;
  };
  const getTodayDateString = () => new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const formatMachineId = (machineId: string) => machineId.replace(/^0+/, '') || '0';

  // Quality score calculation (0-1000)
  const qualityScore = useMemo(() => {
    const r = displayedReading;
    if (r.fat === 0 && r.snf === 0) return 0;
    const fatScore = Math.min(r.fat / 6, 1) * 333;
    const snfScore = Math.min(r.snf / 10, 1) * 333;
    const clrScore = Math.min(r.clr / 35, 1) * 334;
    return Math.round(fatScore + snfScore + clrScore);
  }, [displayedReading]);

  const qualityRating = qualityScore >= 700 ? 'Excellent' : qualityScore >= 500 ? 'Good' : qualityScore >= 300 ? 'Average' : qualityScore > 0 ? 'Low' : 'No Data';

  useEffect(() => {
    if (isOpen && machineDbId) fetchMachineDetails();
    return () => { if (testTimerRef.current) clearInterval(testTimerRef.current); };
  }, [isOpen, machineDbId, fetchMachineDetails]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (showFarmerIdDialog) { setShowFarmerIdDialog(false); return; }
        if (showWeightDialog) { setShowWeightDialog(false); return; }
        if (showSettingsPanel) { setShowSettingsPanel(false); return; }
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, showFarmerIdDialog, showWeightDialog, showSettingsPanel]);

  if (!mounted || !isOpen) return null;

  // ============================================
  // Custom Input Component
  // ============================================
  const CustomInput = ({ 
    value, 
    onChange, 
    onKeyDown, 
    placeholder, 
    autoFocus, 
    type = "text",
    step,
    dataAttribute 
  }: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    placeholder: string;
    autoFocus?: boolean;
    type?: string;
    step?: string;
    dataAttribute?: string;
  }) => {
    const inputStyle = {
      width: '100%',
      paddingLeft: '2.75rem',
      paddingRight: type === 'number' && step ? '3rem' : '1rem',
      paddingTop: '0.75rem',
      paddingBottom: '0.75rem',
      borderRadius: '0.75rem',
      fontSize: '0.875rem',
      border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgb(209, 213, 219)',
      backgroundColor: isDark ? 'rgb(31, 41, 55)' : 'rgb(255, 255, 255)',
      color: isDark ? 'rgb(255, 255, 255)' : 'rgb(17, 24, 39)',
      outline: 'none',
      transition: 'all 0.15s ease-in-out',
      caretColor: isDark ? 'rgb(255, 255, 255)' : 'rgb(17, 24, 39)'
    };

    const focusStyle = isDark 
      ? {
          borderColor: 'rgb(52, 211, 153)',
          boxShadow: '0 0 0 2px rgba(52, 211, 153, 0.2)'
        }
      : {
          borderColor: 'rgb(16, 185, 129)',
          boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.1)'
        };

    const hoverStyle = isDark
      ? { backgroundColor: 'rgb(55, 65, 81)' }
      : { backgroundColor: 'rgb(249, 250, 251)' };

    return (
      <input
        type={type}
        step={step}
        placeholder={placeholder}
        autoFocus={autoFocus}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        {...(dataAttribute ? { [dataAttribute.split('=')[0]]: dataAttribute.split('=')[1] } : {})}
        style={inputStyle}
        onFocus={(e) => {
          Object.assign((e.target as HTMLInputElement).style, focusStyle);
        }}
        onBlur={(e) => {
          (e.target as HTMLInputElement).style.borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgb(209, 213, 219)';
          (e.target as HTMLInputElement).style.boxShadow = 'none';
        }}
        onMouseEnter={(e) => {
          if (document.activeElement !== e.target) {
            Object.assign((e.target as HTMLInputElement).style, hoverStyle);
          }
        }}
        onMouseLeave={(e) => {
          if (document.activeElement !== e.target) {
            (e.target as HTMLInputElement).style.backgroundColor = isDark ? 'rgb(31, 41, 55)' : 'rgb(255, 255, 255)';
          }
        }}
      />
    );
  };

  // ============================================
  // Sub-Dialogs (Farmer ID, Weight, Settings)
  // ============================================
  const FarmerIdDialog = () => {
    const machineIds = Array.from(connectedBLEMachines.keys()).filter(id => !(machineFarmerIdMode.get(id) ?? false));
    const [tempFarmerIds, setTempFarmerIds] = useState<Map<string, string>>(new Map());
    const allFilled = machineIds.every(id => (tempFarmerIds.get(id) || '').trim() !== '');
    const hasManualWeight = machineIds.some(id => !(machineWeighingScaleMode.get(id) ?? false));
    const handleSubmit = () => { if (allFilled) handleFarmerIdDialogComplete(tempFarmerIds); };
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
          className="rounded-2xl border border-gray-300 dark:border-white/10 shadow-2xl w-full max-w-md mx-4 overflow-hidden bg-white dark:bg-gray-900">
          <div className="flex items-center gap-3 p-5 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-800/50">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-200 dark:bg-emerald-500/20"><User className="w-5 h-5 text-gray-700 dark:text-emerald-400" /></div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Enter Farmer IDs</h3>
          </div>
          <div className="p-5 space-y-4 max-h-[60vh] overflow-auto">
            {machineIds.map((machineId, index) => (
              <div key={machineId} className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Machine M-{formatMachineId(machineId)}</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-emerald-400/60 z-10" />
                  <CustomInput
                    type="number"
                    placeholder="Enter Farmer ID"
                    autoFocus={index === 0}
                    value={tempFarmerIds.get(machineId) || ''}
                    onChange={(e) => { const m = new Map(tempFarmerIds); m.set(machineId, e.target.value); setTempFarmerIds(m); }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (index < machineIds.length - 1) (document.querySelector(`input[data-machine="${machineIds[index + 1]}"]`) as HTMLInputElement)?.focus();
                        else if (allFilled) handleSubmit();
                      }
                    }}
                    dataAttribute={`data-machine=${machineId}`}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 p-5 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-800/50">
            <button onClick={() => setShowFarmerIdDialog(false)} className="flex-1 py-3 rounded-xl border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors font-medium">Cancel</button>
            <button onClick={handleSubmit} disabled={!allFilled}
              className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                allFilled 
                  ? 'bg-emerald-500 dark:bg-emerald-600 text-white hover:bg-emerald-600 dark:hover:bg-emerald-700' 
                  : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }`}>
              {hasManualWeight ? 'Next' : 'Start Test'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  const WeightDialog = () => {
    const machineIds = Array.from(connectedBLEMachines.keys()).filter(id => !(machineWeighingScaleMode.get(id) ?? false));
    const [tempWeights, setTempWeights] = useState<Map<string, string>>(new Map());
    const allFilled = machineIds.every(id => (tempWeights.get(id) || '').trim() !== '');
    const handleSubmit = () => { if (allFilled) handleWeightDialogComplete(tempWeights); };
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
          className="rounded-2xl border border-gray-300 dark:border-white/10 shadow-2xl w-full max-w-md mx-4 overflow-hidden bg-white dark:bg-gray-900">
          <div className="flex items-center gap-3 p-5 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-800/50">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-cyan-500/20"><Scale className="w-5 h-5 text-gray-700 dark:text-cyan-400" /></div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Enter Weights</h3>
          </div>
          <div className="p-5 space-y-4 max-h-[60vh] overflow-auto">
            {machineIds.map((machineId, index) => (
              <div key={machineId} className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Machine M-{formatMachineId(machineId)}</label>
                <div className="relative">
                  <Scale className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-700 dark:text-cyan-400/60 z-10" />
                  <CustomInput
                    type="number"
                    step="0.01"
                    placeholder="Enter Weight"
                    autoFocus={index === 0}
                    value={tempWeights.get(machineId) || ''}
                    onChange={(e) => { const m = new Map(tempWeights); m.set(machineId, e.target.value); setTempWeights(m); }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (index < machineIds.length - 1) (document.querySelector(`input[data-weight-machine="${machineIds[index + 1]}"]`) as HTMLInputElement)?.focus();
                        else if (allFilled) handleSubmit();
                      }
                    }}
                    dataAttribute={`data-weight-machine=${machineId}`}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400 font-medium z-10">kg</span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 p-5 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-800/50">
            <button onClick={() => setShowWeightDialog(false)} className="flex-1 py-3 rounded-xl border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors font-medium">Cancel</button>
            <button onClick={handleSubmit} disabled={!allFilled}
              className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                allFilled 
                  ? 'bg-emerald-500 dark:bg-emerald-600 text-white hover:bg-emerald-600 dark:hover:bg-emerald-700' 
                  : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }`}>
              Start Test
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  // ============================================
  // Sidebar Navigation Items
  // ============================================
  // Main Render
  // ============================================
  const dialogContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] overflow-hidden" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }}
            transition={{ duration: 0.25 }} className={`absolute inset-0 flex flex-col ${
              isDark ? 'bg-gray-950' : 'bg-white'
            }`}>

              {/* Top Header Bar */}
              <header className={`flex items-center justify-between px-6 py-4 border-b ${
                isDark ? 'border-white/10 bg-gray-900/50' : 'border-gray-200 bg-gray-50'
              }`}>
                {/* Left: Welcome */}
                <div className="flex items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[15px] font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Welcome,</span>
                      <span className={`text-[15px] font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{machine?.machineName || 'Machine'}</span>
                    </div>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {isViewingHistory ? 'Viewing History' : 'Live monitoring active'} • {getTodayDateString()}
                    </p>
                  </div>
                </div>

                {/* Right: History / Machine Switcher */}
                <div className="flex items-center gap-3">

                  {/* History Navigator */}
                  {readingHistory.length > 1 && (
                    <div className="hidden sm:flex items-center gap-1.5">
                      <button onClick={goToPreviousReading} disabled={historyIndex >= readingHistory.length - 1}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 text-gray-700 dark:text-gray-400 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                      <button onClick={goToLiveReading}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          isViewingHistory ? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-white/10' : 'bg-gray-900 dark:bg-violet-500 text-white border border-gray-900 dark:border-violet-500'
                        }`}>
                        {isViewingHistory ? <span className="flex items-center gap-1"><History className="w-3 h-3" />{historyIndex + 1}/{readingHistory.length}</span> : <span className="flex items-center gap-1"><Activity className="w-3 h-3" />LIVE</span>}
                      </button>
                      <button onClick={goToNextReading} disabled={historyIndex <= 0}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 text-gray-700 dark:text-gray-400 transition-colors"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                  )}

                  {/* Machine Badge */}
                  <div className="relative group">
                    <button className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                      selectedMachineId && connectedBLEMachines.has(selectedMachineId)
                        ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-white/10 text-gray-900 dark:text-white'
                        : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-white/5 text-gray-700 dark:text-gray-300'
                    }`}>
                      <Bluetooth className="w-3.5 h-3.5" />
                      <span className="font-bold">M-{selectedMachineId || '--'}</span>
                      {connectedBLEMachines.size > 1 && <ChevronDown className="w-3.5 h-3.5 opacity-60" />}
                    </button>
                    {connectedBLEMachines.size > 1 && (
                      <div className="absolute right-0 top-full mt-1.5 min-w-[220px] py-2 rounded-xl border border-gray-300 dark:border-white/10 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 bg-white dark:bg-gray-900">
                        {Array.from(connectedBLEMachines).map((mId, index) => {
                          const isSelected = selectedMachineId === mId;
                          const lastReading = machineReadings.get(mId);
                          return (
                            <button key={mId} onClick={() => setSelectedMachineId(mId)}
                              className={`w-full px-4 py-2.5 flex items-center gap-3 transition-all hover:bg-gray-100 dark:hover:bg-gray-800/50 ${isSelected ? 'bg-gray-100 dark:bg-gray-800' : ''}`}>
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${isSelected ? 'bg-gray-900 dark:bg-emerald-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>{index + 1}</div>
                              <div className="flex-1 text-left">
                                <span className={`text-sm font-medium ${isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>Machine M-{mId}</span>
                                {lastReading ? <p className="text-[10px] text-gray-600 dark:text-gray-400">FAT: {lastReading.fat.toFixed(1)} | SNF: {lastReading.snf.toFixed(1)}</p>
                                  : <p className="text-[10px] text-gray-600 dark:text-gray-400">Connected</p>}
                              </div>
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-gray-900 dark:bg-emerald-500" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Close Button */}
                  <button
                    onClick={onClose}
                    className="p-2 rounded-xl border border-gray-300 text-gray-700 hover:text-red-600 hover:bg-red-50 hover:border-red-300 transition-all"
                    title="Close Control Panel"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </header>

              {/* Status Messages (Snackbar) */}
              <StatusMessage
                success={success}
                error={error}
                onClose={() => {
                  setError('');
                  setSuccess('');
                }}
              />

              {/* Loading State */}
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center z-50 bg-gray-50/95 dark:bg-gray-950/95">
                  <div className="flex flex-col items-center gap-5">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full bg-gray-200 animate-pulse" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 border-[3px] border-gray-300 rounded-full" />
                        <div className="absolute w-12 h-12 border-[3px] border-gray-900 border-t-transparent rounded-full animate-spin" />
                      </div>
                    </div>
                    <div className="text-center">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Initializing Dashboard</h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Loading machine data...</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ===== SCROLLABLE MAIN CONTENT ===== */}
              <main className="flex-1 overflow-auto p-6 pb-24">
                <div className="max-w-[1800px] mx-auto h-full">
                  {/* Maximized Single-Screen Layout */}
                  <div className="grid grid-cols-12 gap-6 h-full">
                    {/* Left Column: Readings + Trend */}
                    <div className="col-span-12 xl:col-span-7 space-y-5 flex flex-col">
                      {/* Top: Reading Cards */}
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Current Readings</h2>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-medium ${isViewingHistory ? 'text-gray-700 dark:text-gray-400' : 'text-gray-600 dark:text-gray-400'}`}>{formatTimestamp(displayedReading.timestamp)}</span>
                            <button onClick={clearCurrentReadingsOnly}
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors" title="Clear current readings">
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 lg:grid-cols-5 gap-4">
                          <CompactReadingCard icon={<Droplet className="w-6 h-6" />} label="FAT" value={`${displayedReading.fat.toFixed(2)}%`} iconBg="bg-pink-500" />
                          <CompactReadingCard icon={<Gauge className="w-6 h-6" />} label="SNF" value={`${displayedReading.snf.toFixed(2)}%`} iconBg="bg-orange-500" />
                          <CompactReadingCard icon={<Beaker className="w-6 h-6" />} label="CLR" value={displayedReading.clr.toFixed(1)} iconBg="bg-violet-500" />
                          <CompactReadingCard icon={<FlaskConical className="w-6 h-6" />} label="Protein" value={`${displayedReading.protein.toFixed(2)}%`} iconBg="bg-blue-500" />
                          <CompactReadingCard icon={<Thermometer className="w-6 h-6" />} label="Temp" value={`${displayedReading.temperature.toFixed(1)}°C`} iconBg="bg-teal-500" />
                        </div>
                      </div>

                      {/* Quality Score + Composition Combined */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 flex-1">
                        {/* Quality Score */}
                        <CompactDashboardCard title="Quality Score">
                          <CompactQualityGauge score={qualityScore} rating={qualityRating} />
                        </CompactDashboardCard>

                        {/* Milk Composition */}
                        <CompactDashboardCard title="Milk Composition">
                          <CompactCompositionDonut reading={displayedReading} />
                        </CompactDashboardCard>
                      </div>

                      {/* Connected Machines Report */}
                      <CompactDashboardCard title="Connected Machines Report" rightContent={
                        <span className="text-xs text-gray-600 dark:text-gray-400 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800">
                          {connectedBLEMachines.size} {connectedBLEMachines.size === 1 ? 'machine' : 'machines'}
                        </span>
                      }>
                        <ConnectedMachinesReport 
                          connectedMachines={connectedBLEMachines} 
                          machineReadings={machineReadings}
                          machineReadingHistory={machineReadingHistory}
                          formatTimestamp={formatTimestamp}
                          formatFarmerId={formatFarmerId}
                          selectedMachineId={selectedMachineId}
                          onSelectMachine={(machineId) => {
                            const lastReading = machineReadings.get(machineId);
                            if (lastReading) {
                              setSelectedMachineId(machineId);
                            }
                          }}
                        />
                      </CompactDashboardCard>
                    </div>

                    {/* Right Column: Transaction + Trend + Summary */}
                    <div className="col-span-12 xl:col-span-5 space-y-5 flex flex-col">
                      {/* Transaction */}
                      <CompactDashboardCard title="Transaction">
                        <div className="space-y-5">
                          {/* Farmer ID Badge */}
                          <div className="flex items-center justify-between px-5 py-4 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30 border border-gray-200 dark:border-white/10">
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-xl bg-gray-900 dark:bg-emerald-500 flex items-center justify-center">
                                <User className="w-6 h-6 text-white" />
                              </div>
                              <span className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Farmer ID</span>
                            </div>
                            <span className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{formatFarmerId(displayedReading.farmerId)}</span>
                          </div>

                          {/* Calculation Formula */}
                          <div className="space-y-4">
                            {/* Formula Display */}
                            <div className="flex items-center justify-center gap-3 flex-wrap">
                              {/* Quantity Box */}
                              <div className="flex flex-col items-center gap-2">
                                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Quantity</span>
                                <div className="px-5 py-3.5 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 border-2 border-cyan-200 dark:border-cyan-500/30">
                                  <span className="text-2xl font-bold text-cyan-700 dark:text-cyan-400">{displayedReading.quantity.toFixed(1)}</span>
                                  <span className="text-sm font-medium text-cyan-600 dark:text-cyan-400 ml-1">L</span>
                                </div>
                              </div>

                              {/* Multiply Symbol */}
                              <div className="text-3xl font-bold text-gray-400 dark:text-gray-500 mt-8">×</div>

                              {/* Rate + Bonus Group */}
                              <div className="flex flex-col items-center gap-2">
                                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Rate + Bonus</span>
                                <div className="flex items-center gap-2 px-4 py-3.5 rounded-xl bg-violet-50 dark:bg-violet-500/10 border-2 border-violet-200 dark:border-violet-500/30">
                                  {/* Rate */}
                                  <div className="flex items-baseline gap-0.5">
                                    <span className="text-sm text-violet-600 dark:text-violet-400">₹</span>
                                    <span className="text-xl font-bold text-violet-700 dark:text-violet-400">{displayedReading.rate.toFixed(2)}</span>
                                  </div>
                                  
                                  {/* Plus */}
                                  <span className="text-lg font-bold text-violet-500 dark:text-violet-400">+</span>
                                  
                                  {/* Bonus */}
                                  <div className="flex items-baseline gap-0.5">
                                    <span className="text-sm text-amber-600 dark:text-amber-400">₹</span>
                                    <span className="text-xl font-bold text-amber-700 dark:text-amber-400">{displayedReading.incentive.toFixed(2)}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Equals Symbol */}
                              <div className="text-3xl font-bold text-gray-400 dark:text-gray-500 mt-8">=</div>

                              {/* Total Box */}
                              <div className="flex flex-col items-center gap-2">
                                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Total</span>
                                <div className="px-5 py-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-300 dark:border-emerald-500/40">
                                  <span className="text-sm text-emerald-600 dark:text-emerald-400 mr-0.5">₹</span>
                                  <span className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">{displayedReading.totalAmount.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CompactDashboardCard>

                      {/* Trend Summary */}
                      <CompactDashboardCard title="Trend Summary" rightContent={
                        <span className="text-xs text-gray-600 dark:text-gray-400 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800">
                          {readingHistory.length} readings
                        </span>
                      }>
                        <div className="h-56">
                          {readingHistory.length > 1 ? (
                            <TrendChartSVG readings={readingHistory} />
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-600 dark:text-gray-400 space-y-2">
                              <Waves className="w-8 h-8 opacity-40" />
                              <span className="text-sm">
                                {readingHistory.length === 0 
                                  ? 'No data available'
                                  : `Need ${2 - readingHistory.length} more reading${2 - readingHistory.length > 1 ? 's' : ''}`
                                }
                              </span>
                              <span className="text-xs opacity-60">
                                {selectedMachineId ? `Machine M-${selectedMachineId}` : 'No machine selected'}
                              </span>
                            </div>
                          )}
                        </div>
                        {process.env.NODE_ENV === 'development' && (
                          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-white/10 pt-2 break-words">
                            <div>Cache: {machineReadingHistory.size} machines, {readingHistory.length} readings</div>
                            {selectedMachineId && (
                              <div>M-{selectedMachineId}: {machineReadingHistory.get(selectedMachineId)?.length || 0} cached</div>
                            )}
                          </div>
                        )}
                      </CompactDashboardCard>

                      {/* Today's Summary */}
                      {todayStats.totalTests > 0 && (
                        <CompactDashboardCard title="Today's Summary">
                          <div className="grid grid-cols-2 gap-4">
                            <MiniStat label="Total Qty" value={`${todayStats.totalQuantity.toFixed(1)} L`} icon={<Scale className="w-4 h-4" />} />
                            <MiniStat label="Revenue" value={`₹${todayStats.totalAmount.toFixed(0)}`} icon={<Award className="w-4 h-4" />} />
                            <MiniStat label="Avg FAT" value={`${todayStats.avgFat.toFixed(2)}%`} icon={<Droplet className="w-4 h-4" />} />
                            <MiniStat label="Avg SNF" value={`${todayStats.avgSnf.toFixed(2)}%`} icon={<Gauge className="w-4 h-4" />} />
                          </div>
                        </CompactDashboardCard>
                      )}
                    </div>
                  </div>
                </div>
              </main>

              {/* ===== BOTTOM ACTION BAR ===== */}
              <div className={`flex-shrink-0 border-t px-6 py-3 ${
                isDark ? 'border-white/10 bg-gray-900/50' : 'border-gray-200 bg-gray-50'
              }`}>
                <div className="max-w-xl mx-auto flex items-center gap-3">
                  {/* Test Button */}
                  <ActionButton
                    icon={isTestRunning ? <Timer className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    label={isTestRunning ? `Testing ${testElapsedSeconds}s` : 'Test'}
                    color="violet"
                    onClick={isTestRunning ? undefined : handleTest}
                    isActive={isTestRunning}
                    isPrimary
                  />
                  <ActionButton icon={<Check className="w-5 h-5" />} label="OK" color="emerald" onClick={handleOk} />
                  <ActionButton icon={<X className="w-5 h-5" />} label="Cancel" color="amber" onClick={handleCancel} />
                  <ActionButton icon={<Droplets className="w-5 h-5" />} label="Clean" color="blue" onClick={handleClean} />
                  
                  {/* Channel Selector */}
                  <div className="relative group">
                    <button className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-white/10 text-sm font-medium transition-all ${
                      selectedChannel === 'CH1' 
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                        : selectedChannel === 'CH2' 
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}>
                      <span>{selectedChannel === 'CH1' ? '🐄' : selectedChannel === 'CH2' ? '🐃' : '🔀'}</span>
                      <span className="hidden sm:inline">{selectedChannel === 'CH1' ? 'Cow' : selectedChannel === 'CH2' ? 'Buffalo' : 'Mixed'}</span>
                      <ChevronDown className="w-3.5 h-3.5 opacity-60 group-hover:translate-y-0.5 transition-transform" />
                    </button>

                    {/* Dropdown Menu */}
                    <div className="absolute left-0 bottom-full mb-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                      <div className="rounded-2xl border border-gray-300 dark:border-white/10 shadow-2xl overflow-hidden backdrop-blur-xl bg-white dark:bg-gray-900">
                        <div className="p-2 space-y-1">
                          {(['CH1', 'CH2', 'CH3'] as const).map((ch) => {
                            const isSelected = selectedChannel === ch;
                            const config = ch === 'CH1' 
                              ? { emoji: '🐄', label: 'Cow', sublabel: 'Channel 1', color: 'emerald' }
                              : ch === 'CH2'
                              ? { emoji: '🐃', label: 'Buffalo', sublabel: 'Channel 2', color: 'blue' }
                              : { emoji: '🔀', label: 'Mixed', sublabel: 'Channel 3', color: 'amber' };
                            
                            return (
                              <button key={ch} onClick={() => setSelectedChannel(ch)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all group/item ${
                                  isSelected
                                    ? 'bg-gray-100 border border-gray-300 shadow-md'
                                    : 'hover:bg-gray-50 border border-transparent'
                                }`}>
                                {/* Icon */}
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all ${
                                  isSelected
                                    ? 'bg-gray-200'
                                    : 'bg-gray-100 group-hover/item:bg-gray-200'
                                }`}>
                                  {config.emoji}
                                </div>
                                
                                {/* Labels */}
                                <div className="flex-1 min-w-0">
                                  <div className={`text-sm font-semibold transition-colors ${
                                    isSelected
                                      ? 'text-gray-900 dark:text-white'
                                      : 'text-gray-700 dark:text-gray-400 group-hover/item:text-gray-900 dark:group-hover/item:text-white'
                                  }`}>
                                    {config.label}
                                  </div>
                                  <div className="text-[10px] text-gray-600 dark:text-gray-500 uppercase tracking-wider">{config.sublabel}</div>
                                </div>
                                
                                {/* Check Icon */}
                                {isSelected && (
                                  <div className="w-5 h-5 rounded-full flex items-center justify-center bg-gray-900">
                                    <Check className="w-3 h-3 text-white" />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                        
                        {/* Info Footer */}
                        <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
                          <p className="text-[10px] text-gray-600 text-center">Select milk type for testing</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <ActionButton icon={<Settings className="w-5 h-5" />} label="Settings" color="violet" onClick={() => setShowSettingsPanel(true)} />
                </div>
              </div>

            {/* ===== DIALOGS ===== */}
            <AnimatePresence>{showFarmerIdDialog && <FarmerIdDialog />}</AnimatePresence>
            <AnimatePresence>{showWeightDialog && <WeightDialog />}</AnimatePresence>

            {/* Settings Panel */}
            <AnimatePresence>
              {showSettingsPanel && (
                <motion.div key="settings-panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowSettingsPanel(false)}>
                  <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className={`rounded-2xl border shadow-2xl w-full max-w-lg mx-4 overflow-hidden ${
                      isDark ? 'border-white/10 bg-gray-900' : 'border-gray-300 bg-white'
                    }`}
                    onClick={(e) => e.stopPropagation()}>
                    {/* Settings Header */}
                    <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-800/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-violet-500/20"><Settings className="w-5 h-5 text-gray-700 dark:text-violet-400" /></div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Test Settings</h3>
                      </div>
                      <button onClick={() => setShowSettingsPanel(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"><X className="w-5 h-5 text-gray-700 dark:text-gray-400" /></button>
                    </div>
                    {/* Settings Content */}
                    <div className="p-5 space-y-4 max-h-[60vh] overflow-auto">
                      {Array.from(connectedBLEMachines.keys()).map((machineId) => (
                        <div key={machineId} className="rounded-xl p-4 space-y-3 bg-gray-50 dark:bg-gray-800/50">
                          <div className="flex items-center gap-2">
                            <Bluetooth className="w-4 h-4 text-gray-700 dark:text-emerald-400" />
                            <span className="font-semibold text-gray-900 dark:text-white text-sm">Machine M-{formatMachineId(machineId)}</span>
                          </div>
                          {/* Weighing Scale Mode */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-400"><Scale className="w-4 h-4" /><span>Weighing Scale:</span></div>
                            <div className="flex gap-1">
                              <button onClick={() => { const m = new Map(machineWeighingScaleMode); m.set(machineId, true); setMachineWeighingScaleMode(m); }}
                                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${machineWeighingScaleMode.get(machineId) ?? false ? 'bg-gray-900 dark:bg-emerald-500/15 text-white dark:text-emerald-400 border border-gray-900 dark:border-emerald-500/30' : 'bg-gray-200 dark:bg-white/5 text-gray-700 dark:text-gray-500 hover:bg-gray-300 dark:hover:bg-white/10'}`}>Auto</button>
                              <button onClick={() => { const m = new Map(machineWeighingScaleMode); m.set(machineId, false); setMachineWeighingScaleMode(m); }}
                                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${!(machineWeighingScaleMode.get(machineId) ?? false) ? 'bg-gray-900 dark:bg-amber-500/15 text-white dark:text-amber-400 border border-gray-900 dark:border-amber-500/30' : 'bg-gray-200 dark:bg-white/5 text-gray-700 dark:text-gray-500 hover:bg-gray-300 dark:hover:bg-white/10'}`}>Manual</button>
                            </div>
                          </div>
                          {/* Farmer ID Mode */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-400"><User className="w-4 h-4" /><span>Farmer ID:</span></div>
                            <div className="flex gap-1">
                              <button onClick={() => { const m = new Map(machineFarmerIdMode); m.set(machineId, true); setMachineFarmerIdMode(m); }}
                                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${machineFarmerIdMode.get(machineId) ?? false ? 'bg-gray-900 dark:bg-emerald-500/15 text-white dark:text-emerald-400 border border-gray-900 dark:border-emerald-500/30' : 'bg-gray-200 dark:bg-white/5 text-gray-700 dark:text-gray-500 hover:bg-gray-300 dark:hover:bg-white/10'}`}>Auto</button>
                              <button onClick={() => { const m = new Map(machineFarmerIdMode); m.set(machineId, false); setMachineFarmerIdMode(m); }}
                                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${!(machineFarmerIdMode.get(machineId) ?? false) ? 'bg-gray-900 dark:bg-amber-500/15 text-white dark:text-amber-400 border border-gray-900 dark:border-amber-500/30' : 'bg-gray-200 dark:bg-white/5 text-gray-700 dark:text-gray-500 hover:bg-gray-300 dark:hover:bg-white/10'}`}>Manual</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Settings Actions */}
                    <div className="p-5 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-800/50">
                      <button onClick={() => setShowSettingsPanel(false)}
                        className="w-full py-3 rounded-xl bg-gray-900 dark:bg-violet-500 text-white font-semibold hover:bg-gray-800 dark:hover:bg-violet-600 transition-all">Done</button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(dialogContent, document.body);
}

// ============================================
// Sub-Components - VertexGuard Inspired
// ============================================

/** Compact Reading Card - Maximized for available space */
function CompactReadingCard({ icon, label, value, iconBg }: { icon: React.ReactNode; label: string; value: string; iconBg: string }) {
  return (
    <div className="flex flex-col items-center gap-3 p-5 rounded-2xl border border-gray-300 dark:border-white/10 hover:border-gray-400 dark:hover:border-white/20 transition-all hover:shadow-lg bg-white dark:bg-gray-900">
      <div className={`w-14 h-14 rounded-2xl ${iconBg} text-white flex items-center justify-center shadow-lg`}
        style={{ boxShadow: `0 8px 24px -4px ${iconBg.includes('pink') ? 'rgba(236,72,153,0.3)' : iconBg.includes('orange') ? 'rgba(249,115,22,0.3)' : iconBg.includes('violet') ? 'rgba(139,92,246,0.3)' : iconBg.includes('blue') ? 'rgba(59,130,246,0.3)' : iconBg.includes('cyan') ? 'rgba(6,182,212,0.3)' : 'rgba(20,184,166,0.3)'}` }}>
        {icon}
      </div>
      <span className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{value}</span>
      <span className="text-[11px] text-gray-600 dark:text-gray-400 font-medium uppercase tracking-wide">{label}</span>
    </div>
  );
}

/** Compact Dashboard Card - Optimized padding */
function CompactDashboardCard({ title, rightContent, children }: { title: string; rightContent?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-300 dark:border-white/10 overflow-hidden h-full flex flex-col bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-white/10">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
        {rightContent}
      </div>
      <div className="p-5 flex-1">{children}</div>
    </div>
  );
}

/** Compact Quality Gauge - Maximized version */
function CompactQualityGauge({ score, rating }: { score: number; rating: string }) {
  const percentage = Math.min(score / 1000, 1);
  const ratingColor = score >= 700 ? '#10b981' : score >= 500 ? '#f59e0b' : score >= 300 ? '#f97316' : score > 0 ? '#ef4444' : '#374151';
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const bgStroke = isDark ? '#374151' : '#e5e7eb';

  return (
    <div className="flex flex-col items-center py-4">
      {/* SVG Gauge */}
      <div className="relative w-56 h-32">
        <svg viewBox="0 0 200 110" className="w-full h-full">
          {/* Background arc */}
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke={bgStroke} strokeWidth="16" strokeLinecap="round" />
          {/* Gradient definition */}
          <defs>
            <linearGradient id="compactGaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
          {/* Value arc */}
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="url(#compactGaugeGradient)" strokeWidth="16" strokeLinecap="round"
            strokeDasharray={`${percentage * 251.2} 251.2`} style={{ transition: 'stroke-dasharray 0.8s ease' }} />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-0">
          <span className="text-5xl font-black text-gray-900 dark:text-white leading-none">{score}</span>
          <span className="text-xs font-semibold mt-2 px-3 py-1 rounded-full" style={{ color: ratingColor, background: `${ratingColor}15` }}>{rating}</span>
        </div>
      </div>
      {/* Scale labels */}
      <div className="w-full flex justify-between px-8 mt-2">
        <span className="text-xs text-gray-600 dark:text-gray-400">0</span>
        <span className="text-xs text-gray-600 dark:text-gray-400">1000</span>
      </div>
    </div>
  );
}

/** Compact Composition Donut - Maximized version */
function CompactCompositionDonut({ reading }: { reading: MilkReading }) {
  const segments = [
    { label: 'Fat', value: reading.fat, color: '#ec4899' },
    { label: 'Protein', value: reading.protein, color: '#8b5cf6' },
    { label: 'Lactose', value: reading.lactose, color: '#3b82f6' },
    { label: 'Salt', value: reading.salt, color: '#06b6d4' },
    { label: 'Water', value: reading.water, color: '#f97316' },
  ];

  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const hasData = total > 0;
  const dominantPct = hasData ? Math.round((segments[0].value / Math.max(total, 0.01)) * 100) : 0;
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const bgStroke = isDark ? '#374151' : '#e5e7eb';

  // SVG donut parameters
  const cx = 70, cy = 70, r = 50, strokeWidth = 18;
  const circumference = 2 * Math.PI * r;
  let accumulatedOffset = 0;

  return (
    <div className="flex items-center gap-6">
      {/* Donut SVG */}
      <div className="relative flex-shrink-0">
        <svg width="140" height="140" viewBox="0 0 140 140">
          {/* Background ring */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={bgStroke} strokeWidth={strokeWidth} />
          {/* Segments */}
          {hasData && segments.map((seg, i) => {
            const pct = seg.value / total;
            const dashLen = pct * circumference;
            const dashOffset = -accumulatedOffset;
            accumulatedOffset += dashLen;
            if (seg.value === 0) return null;
            return (
              <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth={strokeWidth}
                strokeDasharray={`${dashLen} ${circumference - dashLen}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                transform={`rotate(-90, ${cx}, ${cy})`}
                style={{ transition: 'stroke-dasharray 0.5s ease, stroke-dashoffset 0.5s ease' }} />
            );
          })}
        </svg>
        {/* Center percentage */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-gray-900 dark:text-white">{hasData ? `${dominantPct}%` : '--'}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-3 min-w-0 flex-1">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: seg.color }} />
            <span className="text-xs text-gray-700 dark:text-gray-300 truncate flex-1">{seg.label}</span>
            <span className="text-xs font-semibold text-gray-900 dark:text-white">{seg.value.toFixed(2)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Connected Machines Report - Full table view like admin dashboard */
function ConnectedMachinesReport({ 
  connectedMachines, 
  machineReadings,
  machineReadingHistory,
  formatTimestamp,
  formatFarmerId,
  selectedMachineId,
  onSelectMachine
}: { 
  connectedMachines: Set<string>; 
  machineReadings: Map<string, MilkReading>;
  machineReadingHistory: Map<string, MilkReading[]>;
  formatTimestamp: (d?: Date) => string;
  formatFarmerId: (id: string) => string;
  selectedMachineId: string | null;
  onSelectMachine: (machineId: string) => void;
}) {
  const machines = Array.from(connectedMachines);

  if (machines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-gray-600 dark:text-gray-400">
        <Monitor className="w-8 h-8 mb-2 opacity-40" />
        <span className="text-sm">No machines connected</span>
        <span className="text-xs mt-1">Connect via BLE dongle to see machines</span>
      </div>
    );
  }

  // Combine readings based on number of connected machines
  const allReadings: Array<MilkReading & { machineId: string }> = [];
  
  // Strategy:
  // - Single machine: Show all readings (live + historical)
  // - Multiple machines: Show only LIVE data for all machines
  const showOnlyLiveData = machines.length > 1;

  // First, add current live readings
  machines.forEach(machineId => {
    const currentReading = machineReadings.get(machineId);
    if (currentReading) {
      allReadings.push({ 
        ...currentReading, 
        machineId,
        timestamp: currentReading.timestamp instanceof Date ? currentReading.timestamp : new Date(currentReading.timestamp)
      });
    }
  });

  // Then, add historical readings ONLY if single machine
  if (!showOnlyLiveData) {
    machines.forEach(machineId => {
      const history = machineReadingHistory.get(machineId);
      if (history && history.length > 0) {
        history.forEach(reading => {
          // Ensure timestamp is a Date object
          const readingTimestamp = reading.timestamp instanceof Date ? reading.timestamp : new Date(reading.timestamp);
          
          // Avoid duplicates - check if this reading already exists
          const exists = allReadings.some(r => {
            const rTimestamp = r.timestamp instanceof Date ? r.timestamp : new Date(r.timestamp);
            return r.machineId === machineId && rTimestamp.getTime() === readingTimestamp.getTime();
          });
          
          if (!exists) {
            allReadings.push({ 
              ...reading, 
              machineId,
              timestamp: readingTimestamp
            });
          }
        });
      }
    });
  }

  // Sort by timestamp (newest first)
  allReadings.sort((a, b) => {
    const aTime = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
    const bTime = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
    return bTime - aTime;
  });

  if (allReadings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-gray-600 dark:text-gray-400">
        <Monitor className="w-8 h-8 mb-2 opacity-40" />
        <span className="text-sm">No readings available yet</span>
        <span className="text-xs mt-1">Waiting for data from machines...</span>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
      <table className="w-full">
        <thead className="sticky top-0 bg-white dark:bg-gray-900 z-10">
          <tr className="border-b border-gray-200 dark:border-white/10">
            <th className="text-left py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Reading Time</th>
            <th className="text-left py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Machine ID</th>
            <th className="text-left py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Farmer ID</th>
            <th className="text-left py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">FAT %</th>
            <th className="text-left py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">SNF %</th>
            <th className="text-left py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">CLR</th>
            <th className="text-left py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Protein %</th>
            <th className="text-left py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Qty (L)</th>
            <th className="text-left py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Temp °C</th>
            <th className="text-left py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Amount</th>
          </tr>
        </thead>
        <tbody>
          {allReadings.map((reading, index) => {
            const isSelected = selectedMachineId === reading.machineId;
            const currentMachineReading = machineReadings.get(reading.machineId);
            const isLiveReading = currentMachineReading && (
              (currentMachineReading.timestamp instanceof Date ? currentMachineReading.timestamp.getTime() : new Date(currentMachineReading.timestamp).getTime()) ===
              (reading.timestamp instanceof Date ? reading.timestamp.getTime() : new Date(reading.timestamp).getTime())
            );
            
            return (
              <tr 
                key={`${reading.machineId}-${reading.timestamp.getTime()}-${index}`}
                className={`border-b border-gray-100 dark:border-white/5 transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-gray-100 dark:bg-gray-800/50 hover:bg-gray-200 dark:hover:bg-gray-800/70' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/30'
                }`}
                onClick={() => onSelectMachine(reading.machineId)}
              >
                {/* Reading Time */}
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-700 dark:text-gray-300">{formatTimestamp(reading.timestamp)}</span>
                    {isLiveReading && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                        LIVE
                      </span>
                    )}
                  </div>
                </td>

                {/* Machine ID */}
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                      <Monitor className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-xs font-semibold text-gray-900 dark:text-white">M-{reading.machineId}</span>
                  </div>
                </td>

                {/* Farmer ID */}
                <td className="py-3 px-3">
                  <span className="text-xs text-gray-700 dark:text-gray-300">{formatFarmerId(reading.farmerId)}</span>
                </td>

                {/* FAT */}
                <td className="py-3 px-3">
                  <span className="text-xs font-semibold text-pink-600">{reading.fat.toFixed(2)}</span>
                </td>

                {/* SNF */}
                <td className="py-3 px-3">
                  <span className="text-xs font-semibold text-orange-600">{reading.snf.toFixed(2)}</span>
                </td>

                {/* CLR */}
                <td className="py-3 px-3">
                  <span className="text-xs font-semibold text-violet-600">{reading.clr.toFixed(1)}</span>
                </td>

                {/* Protein */}
                <td className="py-3 px-3">
                  <span className="text-xs font-semibold text-blue-600">{reading.protein.toFixed(2)}</span>
                </td>

                {/* Quantity */}
                <td className="py-3 px-3">
                  <span className="text-xs font-semibold text-cyan-600">{reading.quantity.toFixed(1)}</span>
                </td>

                {/* Temperature */}
                <td className="py-3 px-3">
                  <span className="text-xs font-semibold text-teal-600">{reading.temperature.toFixed(1)}</span>
                </td>

                {/* Amount */}
                <td className="py-3 px-3">
                  <span className="text-xs font-bold text-emerald-600">₹{reading.totalAmount.toFixed(2)}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Individual reading stat card (like "Current Risk" cards in the image) */
function ReadingStatCard({ icon, label, value, iconBg, iconColor }: { icon: React.ReactNode; label: string; value: string; iconBg: string; iconColor: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      className="flex flex-col items-center gap-3 p-4 rounded-2xl border border-gray-300 dark:border-white/10 transition-all hover:border-gray-400 dark:hover:border-white/20 hover:shadow-lg bg-white dark:bg-gray-900">
      <div className={`w-12 h-12 rounded-2xl ${iconBg} ${iconColor} flex items-center justify-center shadow-lg`}
        style={{ boxShadow: `0 8px 24px -4px ${iconBg.includes('pink') ? 'rgba(236,72,153,0.3)' : iconBg.includes('orange') ? 'rgba(249,115,22,0.3)' : iconBg.includes('violet') ? 'rgba(139,92,246,0.3)' : iconBg.includes('blue') ? 'rgba(59,130,246,0.3)' : iconBg.includes('cyan') ? 'rgba(6,182,212,0.3)' : 'rgba(20,184,166,0.3)'}` }}>
        {icon}
      </div>
      <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{value}</span>
      <span className="text-[11px] text-gray-600 dark:text-gray-400 font-medium">{label}</span>
    </motion.div>
  );
}

/** Quality Score Semi-circular Gauge (like "Risk Score" in the image) */
function QualityScoreGauge({ score, rating }: { score: number; rating: string }) {
  const percentage = Math.min(score / 1000, 1);
  const ratingColor = score >= 700 ? '#10b981' : score >= 500 ? '#f59e0b' : score >= 300 ? '#f97316' : score > 0 ? '#ef4444' : '#374151';

  return (
    <div className="rounded-2xl border border-gray-300 dark:border-white/10 p-5 flex flex-col items-center bg-white dark:bg-gray-900">
      {/* SVG Gauge */}
      <div className="relative w-40 h-24 mb-2">
        <svg viewBox="0 0 200 110" className="w-full h-full">
          {/* Background arc */}
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#e5e7eb" strokeWidth="14" strokeLinecap="round" />
          {/* Gradient definition */}
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
          {/* Value arc */}
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="url(#gaugeGradient)" strokeWidth="14" strokeLinecap="round"
            strokeDasharray={`${percentage * 251.2} 251.2`} style={{ transition: 'stroke-dasharray 0.8s ease' }} />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-0">
          <span className="text-4xl font-black text-gray-900 leading-none">{score}</span>
          <span className="text-xs font-semibold mt-1 px-2.5 py-0.5 rounded-full" style={{ color: ratingColor, background: `${ratingColor}15` }}>{rating}</span>
        </div>
      </div>
      {/* Scale labels */}
      <div className="w-full flex justify-between px-4 mt-1">
        <span className="text-[10px] text-gray-600">0</span>
        <span className="text-[10px] text-gray-600">1000</span>
      </div>
    </div>
  );
}

/** Dashboard Card container (dark card with title) */
function DashboardCard({ title, rightContent, children }: { title: string; rightContent?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-300 dark:border-white/10 overflow-hidden bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-white/10">
        <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white">{title}</h3>
        {rightContent}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

/** SVG Trend Line Chart */
function TrendChartSVG({ readings }: { readings: MilkReading[] }) {
  const points = readings.slice(-20);
  console.log('TrendChartSVG Debug - Received readings:', readings.length, 'Using points:', points.length);
  
  if (points.length < 2) {
    console.log('TrendChartSVG Debug - Not enough points for trend chart:', points.length);
    return null;
  }

  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const gridColor = isDark ? '#374151' : '#e5e7eb';
  const textColor = isDark ? '#9ca3af' : '#6b7280';
  const tooltipBg = isDark ? '#1f2937' : '#f9fafb';
  const tooltipBorder = isDark ? '#374151' : '#e5e7eb';
  const pointStroke = isDark ? '#111827' : '#ffffff';

  const W = 640, H = 200, PX = 40, PY = 20;
  const chartW = W - PX * 2, chartH = H - PY * 2;

  const maxFat = Math.max(...points.map(r => r.fat), 8);
  const maxSnf = Math.max(...points.map(r => r.snf), 12);
  const maxQuantity = Math.max(...points.map(r => r.quantity), 1000);
  
  // Scale quantity to be comparable with FAT/SNF for display (quantity is in liters, FAT/SNF are percentages)
  const quantityScaleFactor = Math.max(maxFat, maxSnf) / maxQuantity;
  const scaledQuantities = points.map(p => p.quantity * quantityScaleFactor);
  const maxScaledQuantity = Math.max(...scaledQuantities);
  
  console.log('TrendChartSVG Debug - Quantity scaling:', { maxQuantity, quantityScaleFactor: quantityScaleFactor.toFixed(4), maxScaledQuantity: maxScaledQuantity.toFixed(2) });
  
  const maxVal = Math.max(maxFat, maxSnf, maxScaledQuantity) * 1.15;

  const xScale = (i: number) => PX + (i / (points.length - 1)) * chartW;
  const yScale = (val: number) => PY + chartH - (val / maxVal) * chartH;

  // Build smooth line paths
  const buildPath = (values: number[]) => {
    return values.map((v, i) => `${i === 0 ? 'M' : 'L'}${xScale(i).toFixed(1)},${yScale(v).toFixed(1)}`).join(' ');
  };

  const buildAreaPath = (values: number[]) => {
    const linePath = buildPath(values);
    return `${linePath} L${xScale(values.length - 1).toFixed(1)},${(PY + chartH).toFixed(1)} L${PX.toFixed(1)},${(PY + chartH).toFixed(1)} Z`;
  };

  const fatValues = points.map(p => p.fat);
  const snfValues = points.map(p => p.snf);
  const quantityValues = points.map(p => p.quantity * quantityScaleFactor);

  // Grid lines
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(pct => ({
    y: PY + chartH - pct * chartH,
    label: (pct * maxVal).toFixed(1),
  }));

  // Find last point for tooltip-like indicator
  const lastFat = fatValues[fatValues.length - 1];
  const lastSnf = snfValues[snfValues.length - 1];
  const lastQuantity = points[points.length - 1].quantity;
  const lastScaledQuantity = quantityValues[quantityValues.length - 1];
  const lastX = xScale(points.length - 1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="fatAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="snfAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="quantityAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid */}
      {gridLines.map((g, i) => (
        <g key={i}>
          <line x1={PX} y1={g.y} x2={W - PX} y2={g.y} stroke={gridColor} strokeWidth="1" strokeDasharray="4 4" />
          <text x={PX - 6} y={g.y + 4} textAnchor="end" fill={textColor} fontSize="9" fontFamily="system-ui">{g.label}</text>
        </g>
      ))}

      {/* Area fills */}
      <path d={buildAreaPath(fatValues)} fill="url(#fatAreaGrad)" />
      <path d={buildAreaPath(quantityValues)} fill="url(#quantityAreaGrad)" />

      {/* Lines */}
      <path d={buildPath(snfValues)} fill="none" stroke="#06b6d4" strokeWidth="2" opacity="0.6" strokeLinejoin="round" />
      <path d={buildPath(quantityValues)} fill="none" stroke="#10b981" strokeWidth="2" opacity="0.7" strokeLinejoin="round" />
      <path d={buildPath(fatValues)} fill="none" stroke="#8b5cf6" strokeWidth="2.5" strokeLinejoin="round" />

      {/* Data points (last few) */}
      {points.slice(-5).map((_, i) => {
        const idx = points.length - 5 + i;
        if (idx < 0) return null;
        return (
          <g key={idx}>
            <circle cx={xScale(idx)} cy={yScale(fatValues[idx])} r="3" fill="#8b5cf6" />
            <circle cx={xScale(idx)} cy={yScale(quantityValues[idx])} r="2.5" fill="#10b981" />
          </g>
        );
      })}

      {/* Last point indicators */}
      <circle cx={lastX} cy={yScale(lastFat)} r="5" fill="#8b5cf6" stroke={pointStroke} strokeWidth="2" />
      <circle cx={lastX} cy={yScale(lastScaledQuantity)} r="4" fill="#10b981" stroke={pointStroke} strokeWidth="2" />

      {/* Tooltip box at last point */}
      <g>
        <rect x={lastX - 70} y={yScale(lastFat) - 44} width="140" height="36" rx="6" fill={tooltipBg} stroke={tooltipBorder} strokeWidth="1" />
        <text x={lastX} y={yScale(lastFat) - 25} textAnchor="middle" fill="#8b5cf6" fontSize="9" fontWeight="600" fontFamily="system-ui">
          FAT {lastFat.toFixed(2)} | SNF {lastSnf.toFixed(2)}
        </text>
        <text x={lastX} y={yScale(lastFat) - 13} textAnchor="middle" fill="#10b981" fontSize="9" fontWeight="600" fontFamily="system-ui">
          QTY {lastQuantity.toFixed(0)}L
        </text>
      </g>

      {/* X-axis labels */}
      {points.filter((_, i) => i % Math.max(1, Math.floor(points.length / 6)) === 0 || i === points.length - 1).map((p, i) => {
        const origIdx = points.indexOf(p);
        const label = p.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        return <text key={i} x={xScale(origIdx)} y={H - 4} textAnchor="middle" fill={textColor} fontSize="9" fontFamily="system-ui">{label}</text>;
      })}

      {/* Legend */}
      <circle cx={PX + 10} cy={8} r="4" fill="#8b5cf6" />
      <text x={PX + 18} y={12} fill="#8b5cf6" fontSize="10" fontFamily="system-ui">FAT</text>
      <circle cx={PX + 56} cy={8} r="4" fill="#06b6d4" />
      <text x={PX + 64} y={12} fill="#06b6d4" fontSize="10" fontFamily="system-ui">SNF</text>
      <circle cx={PX + 102} cy={8} r="4" fill="#10b981" />
      <text x={PX + 110} y={12} fill="#10b981" fontSize="10" fontFamily="system-ui">QTY</text>
    </svg>
  );
}

/** Composition Donut Chart (like "Threats By Virus") */
function CompositionDonut({ reading }: { reading: MilkReading }) {
  const segments = [
    { label: 'Fat', value: reading.fat, color: '#ec4899' },
    { label: 'Protein', value: reading.protein, color: '#8b5cf6' },
    { label: 'Lactose', value: reading.lactose, color: '#3b82f6' },
    { label: 'Salt', value: reading.salt, color: '#06b6d4' },
    { label: 'Water', value: reading.water, color: '#f97316' },
  ];

  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const hasData = total > 0;
  const dominantPct = hasData ? Math.round((segments[0].value / Math.max(total, 0.01)) * 100) : 0;

  // SVG donut parameters
  const cx = 70, cy = 70, r = 50, strokeWidth = 18;
  const circumference = 2 * Math.PI * r;
  let accumulatedOffset = 0;

  return (
    <div className="flex items-center gap-4">
      {/* Donut SVG */}
      <div className="relative flex-shrink-0">
        <svg width="140" height="140" viewBox="0 0 140 140">
          {/* Background ring */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} />
          {/* Segments */}
          {hasData && segments.map((seg, i) => {
            const pct = seg.value / total;
            const dashLen = pct * circumference;
            const dashOffset = -accumulatedOffset;
            accumulatedOffset += dashLen;
            if (seg.value === 0) return null;
            return (
              <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth={strokeWidth}
                strokeDasharray={`${dashLen} ${circumference - dashLen}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                transform={`rotate(-90, ${cx}, ${cy})`}
                style={{ transition: 'stroke-dasharray 0.5s ease, stroke-dashoffset 0.5s ease' }} />
            );
          })}
        </svg>
        {/* Center percentage */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-gray-900">{hasData ? `${dominantPct}%` : '--'}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-2 min-w-0 flex-1">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: seg.color }} />
            <span className="text-xs text-gray-700 truncate flex-1">{seg.label}</span>
            <span className="text-xs font-semibold text-gray-900">{seg.value.toFixed(2)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Reading Details Table (like "Threat Details") */
function ReadingDetailsTable({ readings, formatTimestamp, formatFarmerId }: { readings: MilkReading[]; formatTimestamp: (d?: Date) => string; formatFarmerId: (id: string) => string }) {
  const recentReadings = [...readings].reverse().slice(0, 10);

  if (recentReadings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-gray-600">
        <FileText className="w-8 h-8 mb-2 opacity-40" />
        <span className="text-sm">No readings recorded yet</span>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            {['Time', 'Machine', 'Farmer', 'FAT%', 'SNF%', 'CLR', 'Qty(L)'].map(h => (
              <th key={h} className="text-left py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-600">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {recentReadings.map((r, i) => (
            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
              <td className="py-2.5 px-3 text-xs text-gray-700">{formatTimestamp(r.timestamp)}</td>
              <td className="py-2.5 px-3 text-xs font-medium text-gray-900">M-{r.machineId}</td>
              <td className="py-2.5 px-3 text-xs text-gray-700">{formatFarmerId(r.farmerId)}</td>
              <td className="py-2.5 px-3 text-xs font-semibold text-pink-600">{r.fat.toFixed(2)}</td>
              <td className="py-2.5 px-3 text-xs font-semibold text-orange-600">{r.snf.toFixed(2)}</td>
              <td className="py-2.5 px-3 text-xs text-violet-600">{r.clr.toFixed(1)}</td>
              <td className="py-2.5 px-3 text-xs text-cyan-400">{r.quantity.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Mini stat block */
function MiniStat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl p-4 border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-gray-800/50">
      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">{icon}<span className="text-xs uppercase tracking-wider">{label}</span></div>
      <span className="text-lg font-bold text-gray-900 dark:text-white">{value}</span>
    </div>
  );
}

/** Bottom Action Button */
function ActionButton({ icon, label, color, onClick, isActive, isPrimary }: {
  icon: React.ReactNode; label: string; color: string; onClick?: () => void; isActive?: boolean; isPrimary?: boolean;
}) {
  const colorMap: Record<string, { bg: string; hover: string; text: string; activePulse: string; shadow: string }> = {
    violet: { bg: 'bg-gray-100 dark:bg-gray-800', hover: 'hover:bg-gray-200 dark:hover:bg-gray-700', text: 'text-gray-900 dark:text-white', activePulse: 'bg-gray-200 dark:bg-gray-700', shadow: 'shadow-gray-300 dark:shadow-gray-900' },
    emerald: { bg: 'bg-gray-100 dark:bg-gray-800', hover: 'hover:bg-gray-200 dark:hover:bg-gray-700', text: 'text-gray-900 dark:text-white', activePulse: 'bg-gray-200 dark:bg-gray-700', shadow: 'shadow-gray-300 dark:shadow-gray-900' },
    amber: { bg: 'bg-gray-100 dark:bg-gray-800', hover: 'hover:bg-gray-200 dark:hover:bg-gray-700', text: 'text-gray-900 dark:text-white', activePulse: 'bg-gray-200 dark:bg-gray-700', shadow: 'shadow-gray-300 dark:shadow-gray-900' },
    blue: { bg: 'bg-gray-100 dark:bg-gray-800', hover: 'hover:bg-gray-200 dark:hover:bg-gray-700', text: 'text-gray-900 dark:text-white', activePulse: 'bg-gray-200 dark:bg-gray-700', shadow: 'shadow-gray-300 dark:shadow-gray-900' },
  };
  const c = colorMap[color] || colorMap.violet;

  return (
    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onClick} disabled={isActive}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-white/10 transition-all font-medium text-sm ${
        isActive ? `${c.activePulse} ${c.text} animate-pulse` : `${c.bg} ${c.hover} ${c.text}`
      } ${isPrimary ? `shadow-lg ${c.shadow}` : ''}`}>
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </motion.button>
  );
}
