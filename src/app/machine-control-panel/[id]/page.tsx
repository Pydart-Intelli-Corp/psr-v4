'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useDongle } from '@/contexts/DongleContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft,
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
  TrendingDown,
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
  CircleDot,
  Waves,
  Sparkles
} from 'lucide-react';

// Types for control panel
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

// Empty reading template
const emptyReading: MilkReading = {
  milkType: 'cow',
  fat: 0.0,
  snf: 0.0,
  clr: 0.0,
  protein: 0.0,
  lactose: 0.0,
  salt: 0.0,
  water: 0.0,
  temperature: 0.0,
  farmerId: '0',
  quantity: 0.0,
  totalAmount: 0.0,
  rate: 0.0,
  incentive: 0.0,
  machineId: '0',
  timestamp: new Date(),
};

/**
 * Extract value from prefixed string (e.g., "F05.21" -> "05.21")
 */
function extractValue(part: string, prefix: string): string {
  return part.replace(prefix, '');
}

/**
 * Parse double value safely
 */
function parseDoubleValue(value: string): number {
  try {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0.0 : parsed;
  } catch {
    return 0.0;
  }
}

/**
 * Parse Lactosure machine pipe-delimited data format (matching Flutter exactly)
 * Format: LE3.36|A|CH1|F05.21|S12.58|C44.10|P04.60|L06.90|s01.04|W00.00|T20.00|I000100|Q00100.00|R00000.00|r000.00|i000.00|MM00201|D2026-01-05_10:28:12
 * 
 * Parts by position:
 * [0]: LE3.36 (version)
 * [1]: A (status)
 * [2]: CH1 (milk type - CH1=Cow, CH2=Buffalo, CH3=Mixed)
 * [3]: F05.21 (FAT)
 * [4]: S12.58 (SNF)
 * [5]: C44.10 (CLR)
 * [6]: P04.60 (Protein)
 * [7]: L06.90 (Lactose)
 * [8]: s01.04 (Salt - lowercase 's')
 * [9]: W00.00 (Water)
 * [10]: T20.00 (Temperature)
 * [11]: I000100 (Farmer ID)
 * [12]: Q00100.00 (Quantity)
 * [13]: R00000.00 (Total Amount)
 * [14]: r000.00 (Rate - lowercase 'r')
 * [15]: i000.00 (Incentive - lowercase 'i')
 * [16]: MM00201 (Machine ID)
 * [17]: D2026-01-05_10:28:12 (Timestamp)
 */
function parseLactosureData(rawData: string): MilkReading | null {
  try {
    console.log('🔵 [Parser] Raw data received:', rawData);
    console.log('🔵 [Parser] Data length:', rawData.length, 'characters');

    // Remove trailing control characters (like Flutter: replaceAll(RegExp(r'\^@|\r|\n'), ''))
    const cleanData = rawData.replace(/\^@|\r|\n|[\x00-\x1F\x7F]/g, '').trim();
    console.log('🔵 [Parser] After cleanup:', cleanData);

    // Split by pipe delimiter
    const parts = cleanData.split('|');
    console.log('🔵 [Parser] Split into', parts.length, 'parts');

    // Flutter requires at least 16 parts
    if (parts.length < 16) {
      console.log('❌ [Parser] Invalid data - expected at least 16 parts, got', parts.length);
      console.log('📄 [Parser] Parts:', parts);
      return null;
    }

    console.log('📋 [Parser] Parsing each field:');
    for (let i = 0; i < Math.min(parts.length, 18); i++) {
      console.log(`   [${i}]: ${parts[i]}`);
    }

    // Parse timestamp if available (parts[17]: D2026-01-05_10:28:12)
    let readingTimestamp = new Date();
    if (parts.length > 17) {
      try {
        const timestampStr = extractValue(parts[17], 'D');
        // Format: 2026-01-05_10:28:12
        const cleanTimestamp = timestampStr.replace('_', 'T');
        const parsed = new Date(cleanTimestamp);
        if (!isNaN(parsed.getTime())) {
          readingTimestamp = parsed;
        }
      } catch (e) {
        console.log('⚠️ [Parser] Could not parse timestamp:', e);
      }
    }

    // Parse milk type from CH field (parts[2])
    const chValue = extractValue(parts[2], 'CH');
    let milkType: 'cow' | 'buffalo' | 'mixed' = 'cow';
    if (chValue === '2') {
      milkType = 'buffalo';
    } else if (chValue === '3') {
      milkType = 'mixed';
    }

    const reading: MilkReading = {
      milkType: milkType,                                           // parts[2]: CH1/CH2/CH3
      fat: parseDoubleValue(extractValue(parts[3], 'F')),           // parts[3]: F05.21
      snf: parseDoubleValue(extractValue(parts[4], 'S')),           // parts[4]: S12.58
      clr: parseDoubleValue(extractValue(parts[5], 'C')),           // parts[5]: C44.10
      protein: parseDoubleValue(extractValue(parts[6], 'P')),       // parts[6]: P04.60
      lactose: parseDoubleValue(extractValue(parts[7], 'L')),       // parts[7]: L06.90
      salt: parseDoubleValue(extractValue(parts[8], 's')),          // parts[8]: s01.04 (lowercase s!)
      water: parseDoubleValue(extractValue(parts[9], 'W')),         // parts[9]: W00.00
      temperature: parseDoubleValue(extractValue(parts[10], 'T')),  // parts[10]: T20.00
      farmerId: extractValue(parts[11], 'I'),                       // parts[11]: I000100
      quantity: parseDoubleValue(extractValue(parts[12], 'Q')),     // parts[12]: Q00100.00
      totalAmount: parseDoubleValue(extractValue(parts[13], 'R')),  // parts[13]: R00000.00
      rate: parseDoubleValue(extractValue(parts[14], 'r')),         // parts[14]: r000.00 (lowercase r!)
      incentive: parseDoubleValue(extractValue(parts[15], 'i')),    // parts[15]: i000.00 (lowercase i!)
      machineId: parts.length > 16 
        ? extractValue(parts[16], 'MM') 
        : '0',                                                      // parts[16]: MM00201
      timestamp: readingTimestamp,                                  // parts[17]: D2026-01-05_10:28:12
    };

    console.log('✅ [Parser] Successfully created reading:', {
      fat: reading.fat,
      snf: reading.snf,
      clr: reading.clr,
      farmerId: reading.farmerId,
      machineId: reading.machineId,
    });

    return reading;
  } catch (e) {
    console.log('❌ [Parser] Error parsing lactosure data:', e);
    return null;
  }
}

// Glassmorphism Loader
function FullScreenLoader() {
  return (
    <div className="fixed inset-0 bg-[#060a13] flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-5">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-2 border-white/[0.06]" />
          <div className="absolute inset-0 rounded-full border-2 border-emerald-400/70 border-t-transparent animate-spin" />
        </div>
        <div className="text-center">
          <h2 className="text-sm font-semibold text-white/80 tracking-wide">Control Panel</h2>
          <p className="text-white/30 text-xs mt-1">Initializing...</p>
        </div>
      </div>
    </div>
  );
}

// Toast Notification
function Toast({ type, message, onClose }: { type: 'success' | 'error'; message: string; onClose: () => void; }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className={`flex items-center gap-2.5 px-4 py-3 rounded-xl backdrop-blur-2xl shadow-2xl ring-1 ${
        type === 'success'
          ? 'bg-emerald-500/10 ring-emerald-500/20 text-emerald-400'
          : 'bg-red-500/10 ring-red-500/20 text-red-400'
      }`}
    >
      {type === 'success' ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
      <span className="text-xs font-medium max-w-xs truncate">{message}</span>
      <button onClick={onClose} className="p-1 hover:bg-white/[0.06] rounded-md transition-colors ml-1">
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

export default function MachineControlPanelDashboard() {
  const router = useRouter();
  const params = useParams();
  const machineDbId = params.id as string;

  // Machine state
  const [machine, setMachine] = useState<MachineConnection | null>(null);
  const [connectedMachines, setConnectedMachines] = useState<MachineConnection[]>([]);
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
  
  // Reading state - matching Flutter's _machineReadings and _machineReadingHistory
  const [machineReadings, setMachineReadings] = useState<Map<string, MilkReading>>(new Map());
  const [machineReadingHistory, setMachineReadingHistory] = useState<Map<string, MilkReading[]>>(new Map()); // Per-machine history like Flutter
  const [isViewingHistory, setIsViewingHistory] = useState(false);
  const [historyIndex, setHistoryIndex] = useState(0);
  const MAX_HISTORY_POINTS = 20; // Matching Flutter's _maxHistoryPoints
  
  // Test state - matching Flutter's _isTestRunning, _currentTestMachines, _machinesWithDataReceived
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testElapsedSeconds, setTestElapsedSeconds] = useState(0);
  const [selectedChannel, setSelectedChannel] = useState<'CH1' | 'CH2' | 'CH3'>('CH1');
  const [currentTestMachines, setCurrentTestMachines] = useState<string[]>([]); // Machines being tested
  const [machinesWithDataReceived, setMachinesWithDataReceived] = useState<Set<string>>(new Set()); // Machines that received data during test
  
  // Machine modes (Auto/Manual) - per machine settings
  const [machineWeighingScaleMode, setMachineWeighingScaleMode] = useState<Map<string, boolean>>(new Map()); // true = Auto, false = Manual
  const [machineFarmerIdMode, setMachineFarmerIdMode] = useState<Map<string, boolean>>(new Map()); // true = Auto, false = Manual (default)
  
  // Farmer ID and Weight inputs per machine
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

  // Extract numeric ID from machine ID (e.g., "PSR-048" -> "48", "M-201" -> "201")
  const extractNumericId = useCallback((machineId: string | undefined): string | null => {
    if (!machineId) return null;
    const numericId = machineId.replace(/[^0-9]/g, '').replace(/^0+/, '');
    return numericId || null;
  }, []);

  // Check BLE connection status
  const isMachineConnectedViaBLE = useCallback((): boolean => {
    const numericId = extractNumericId(machine?.machineId);
    if (!numericId) return false;
    return connectedBLEMachines.has(numericId);
  }, [machine?.machineId, connectedBLEMachines, extractNumericId]);
  
  // Send command to ALL connected machines via SENDHEXALL
  const sendToAllMachines = useCallback(async (hexCommand: string): Promise<boolean> => {
    if (connectedPort && isDongleVerified) {
      return await sendDongleCommand(`SENDHEXALL,${hexCommand}`);
    }
    setError('No dongle connected. Connect from Machine Management first.');
    return false;
  }, [connectedPort, isDongleVerified, sendDongleCommand]);

  // Normalize machine ID - matching Flutter's _normalizeId
  // Strips 'M' prefix and leading zeros
  const normalizeId = useCallback((id: string): string => {
    return id.replace(/^[Mm]+/, '').replace(/^0+/, '') || '0';
  }, []);
  
  // BLE data subscription - matching Flutter's _setupBLEListener with updateWithBLEData pattern
  useEffect(() => {
    const handleBleData = (machineId: string, data: string) => {
      console.log('\n▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼');
      console.log(`📡 [Control Panel] BLE data received for machine: ${machineId}`);
      console.log(`📡 [Control Panel] Raw data length: ${data.length} characters`);
      
      const parsed = parseLactosureData(data);
      if (!parsed) {
        console.log('❌ [Control Panel] Failed to parse data');
        console.log('▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲\n');
        return;
      }

      // Normalize machine ID for storage (matching Flutter)
      const storageKey = normalizeId(machineId);
      console.log(`🔑 [Control Panel] Storage key (normalized): ${storageKey}`);
      
      const readingWithMachine = { ...parsed, machineId: storageKey };
      
      // Update machine readings Map
      setMachineReadings(prev => {
        const newMap = new Map(prev);
        newMap.set(storageKey, readingWithMachine);
        console.log(`✅ [Control Panel] Updated machineReadings for: ${storageKey}`);
        return newMap;
      });
      
      // Set selected machine if not set
      if (!selectedMachineId) setSelectedMachineId(storageKey);
      
      // Update per-machine reading history (matching Flutter's _machineReadingHistory)
      setMachineReadingHistory(prev => {
        const newHistory = new Map(prev);
        const machineHistory = newHistory.get(storageKey) || [];
        const updatedHistory = [...machineHistory, readingWithMachine];
        
        // Limit to MAX_HISTORY_POINTS (matching Flutter's _maxHistoryPoints)
        if (updatedHistory.length > MAX_HISTORY_POINTS) {
          updatedHistory.shift(); // Remove oldest
        }
        
        newHistory.set(storageKey, updatedHistory);
        console.log(`📊 [Control Panel] History size for ${storageKey}: ${updatedHistory.length}`);
        
        // Calculate stats from all machine histories
        const allReadings: MilkReading[] = [];
        newHistory.forEach(readings => allReadings.push(...readings));
        calculateTodayStats(allReadings);
        
        return newHistory;
      });
      
      // Track machine that received data during test (matching Flutter)
      if (isTestRunning && currentTestMachines.length > 0) {
        // Find matching machine in current test
        for (const testMachine of currentTestMachines) {
          const normalizedTest = normalizeId(testMachine);
          if (normalizedTest === storageKey || testMachine === storageKey) {
            console.log(`✅ [Test] Machine ${testMachine} received data`);
            
            setMachinesWithDataReceived(prev => {
              const newSet = new Set(prev);
              newSet.add(testMachine);
              console.log(`✅ [Test] Machines with data: ${newSet.size}/${currentTestMachines.length}`);
              
              // Check if ALL machines received data - mark complete (matching Flutter)
              if (newSet.size >= currentTestMachines.length && currentTestMachines.length > 0) {
                console.log('🎉 [Test] All machines received data!');
                // Complete test
                handleStopTest();
                setSuccess(`Test Complete: All ${currentTestMachines.length} machine(s) received data! FAT ${parsed.fat.toFixed(2)}%, SNF ${parsed.snf.toFixed(2)}%`);
              }
              
              return newSet;
            });
            break;
          }
        }
      } else {
        // Not in test mode - show notification for data received (matching Flutter's _showDataReceivedSnackbar)
        if (parsed.fat > 0 || parsed.snf > 0) {
          setSuccess(`Data received from M${storageKey}: FAT ${parsed.fat.toFixed(1)}% | SNF ${parsed.snf.toFixed(1)}% | CLR ${parsed.clr.toFixed(1)}`);
        }
      }
      
      console.log(`✅ [Control Panel] UI updated for machine: ${storageKey}`);
      console.log('▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲\n');
    };
    
    onBleData(handleBleData);
    return () => offBleData(handleBleData);
  }, [selectedMachineId, onBleData, offBleData, isTestRunning, currentTestMachines, normalizeId]);

  // Update connected machines from context - merge with API-loaded machine
  useEffect(() => {
    // Start with BLE connected machines
    const bleConnected: MachineConnection[] = Array.from(connectedBLEMachines).map(machineId => ({
      id: machineId, 
      machineId, 
      machineName: `Machine M-${machineId}`,
      isConnected: true, 
      signalStrength: 'excellent' as const,
    }));
    
    // If we have an API-loaded machine, check if it's in BLE list
    if (machine) {
      const apiMachineNumericId = extractNumericId(machine.machineId);
      const isBleConnected = apiMachineNumericId && connectedBLEMachines.has(apiMachineNumericId);
      
      // Check if API machine is already in BLE list
      const existsInBle = bleConnected.some(m => m.machineId === apiMachineNumericId);
      
      if (!existsInBle) {
        // Add API machine to list (with BLE connection status)
        bleConnected.unshift({
          id: machine.id,
          machineId: apiMachineNumericId || machine.machineId,
          machineName: machine.machineName,
          isConnected: isBleConnected || false,
          signalStrength: isBleConnected ? 'excellent' : 'poor',
        });
      }
    }
    
    if (bleConnected.length > 0) {
      setConnectedMachines(bleConnected);
    }
    
    // Auto-select first machine if none selected
    if (!selectedMachineId && bleConnected.length > 0) {
      // Prefer the current machine from URL if it's connected via BLE
      const apiMachineNumericId = extractNumericId(machine?.machineId);
      if (apiMachineNumericId && connectedBLEMachines.has(apiMachineNumericId)) {
        setSelectedMachineId(apiMachineNumericId);
      } else if (bleConnected.length > 0) {
        setSelectedMachineId(bleConnected[0].machineId);
      }
    }
  }, [connectedBLEMachines, selectedMachineId, machine, extractNumericId]);

  const machinesWithData = Array.from(machineReadings.keys());

  // Fetch machine details
  const fetchMachineDetails = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      if (!token) { router.push('/login'); return; }

      const response = await fetch(`/api/user/machine?id=${machineDbId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch machine details');

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
      }
    } catch { setError('Failed to load machine details'); }
    finally { setLoading(false); }
  }, [machineDbId, router]);

  // Fetch machine readings
  const fetchMachineReadings = async (machineId: string, token: string) => {
    try {
      const response = await fetch(`/api/user/reports/collections`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          const today = new Date(); today.setHours(0, 0, 0, 0);
          const machineCollections = result.data
            .filter((col: any) => col.machine_id === machineId)
            .filter((col: any) => {
              const colDate = new Date(col.collection_date);
              colDate.setHours(0, 0, 0, 0);
              return colDate.getTime() === today.getTime();
            })
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
            }));
          // Store in per-machine history (matching Flutter's _machineReadingHistory)
          if (machineCollections.length > 0) {
            const normalizedId = machineId.replace(/^[Mm]+/, '').replace(/^0+/, '') || '0';
            setMachineReadingHistory(prev => {
              const newHistory = new Map(prev);
              newHistory.set(normalizedId, machineCollections.slice(-MAX_HISTORY_POINTS));
              return newHistory;
            });
          }
          calculateTodayStats(machineCollections);
        }
      }
    } catch {}
  };

  // Calculate statistics
  const calculateTodayStats = (readings: MilkReading[]) => {
    if (readings.length === 0) {
      setTodayStats({ totalTests: 0, totalQuantity: 0, totalAmount: 0, avgFat: 0, avgSnf: 0, highestFat: 0, lowestFat: 0, highestSnf: 0, lowestSnf: 0 });
      return;
    }
    let sumFat = 0, sumSnf = 0, sumQuantity = 0, sumAmount = 0;
    let maxFat = 0, minFat = Infinity, maxSnf = 0, minSnf = Infinity;
    readings.forEach(r => {
      sumFat += r.fat; sumSnf += r.snf; sumQuantity += r.quantity; sumAmount += r.totalAmount;
      maxFat = Math.max(maxFat, r.fat); minFat = Math.min(minFat, r.fat);
      maxSnf = Math.max(maxSnf, r.snf); minSnf = Math.min(minSnf, r.snf);
    });
    setTodayStats({
      totalTests: readings.length, totalQuantity: sumQuantity, totalAmount: sumAmount,
      avgFat: sumFat / readings.length, avgSnf: sumSnf / readings.length,
      highestFat: maxFat, lowestFat: minFat === Infinity ? 0 : minFat,
      highestSnf: maxSnf, lowestSnf: minSnf === Infinity ? 0 : minSnf,
    });
  };

  // Build test command matching Flutter format exactly
  // Format: 40 0B 07 [channel] [cycleMode] [farmerID_MSB] [farmerID_MID] [farmerID_LSB] [weight3] [weight2] [weight1] [weight0] [LRC]
  const buildTestCommand = (channel: string, farmerId: string, weight: number): string => {
    // Channel byte: CH1 (Cow) = 0x00, CH2 (Buffalo) = 0x01, CH3 (Mixed) = 0x02
    let channelByte: number;
    switch (channel) {
      case 'CH1': channelByte = 0x00; break;
      case 'CH2': channelByte = 0x01; break;
      case 'CH3': channelByte = 0x02; break;
      default: channelByte = 0x00;
    }

    // Cycle mode (default to 0x00)
    const cycleMode = 0x00;

    // Convert farmer ID to integer and then to 3 bytes (Big-Endian)
    const farmerIdInt = parseInt(farmerId) || 1;
    const farmerIdMsb = (farmerIdInt >> 16) & 0xFF;
    const farmerIdMid = (farmerIdInt >> 8) & 0xFF;
    const farmerIdLsb = farmerIdInt & 0xFF;

    // Convert weight to 4 bytes (multiply by 100, then Big-Endian)
    const weightInt = Math.round(weight * 100);
    const weightByte3 = (weightInt >> 24) & 0xFF;
    const weightByte2 = (weightInt >> 16) & 0xFF;
    const weightByte1 = (weightInt >> 8) & 0xFF;
    const weightByte0 = weightInt & 0xFF;

    // Build command bytes
    const bytes = [
      0x40,         // Header
      0x0B,         // Number of bytes (11)
      0x07,         // Command: Test
      channelByte,  // Channel
      cycleMode,    // Cycle mode
      farmerIdMsb,  // Farmer ID MSB
      farmerIdMid,  // Farmer ID MID
      farmerIdLsb,  // Farmer ID LSB
      weightByte3,  // Weight byte 3 (MSB)
      weightByte2,  // Weight byte 2
      weightByte1,  // Weight byte 1
      weightByte0,  // Weight byte 0 (LSB)
    ];

    // Calculate LRC (XOR of all bytes)
    let lrc = 0;
    bytes.forEach(b => lrc ^= b);
    bytes.push(lrc);

    // Convert to hex string
    const hexCommand = bytes.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join('');
    console.log(`🔧 [Test Command] Channel: ${channel}, Farmer ID: ${farmerIdInt}, Weight: ${weight}kg`);
    console.log(`🔧 [Test Command] Hex: ${hexCommand}`);
    
    return hexCommand;
  };

  // Format machine ID (remove leading zeros)
  const formatMachineId = (machineId: string) => {
    return machineId.replace(/^0+/, '') || '0';
  };

  // Initialize test flow - check modes and show dialogs if needed
  const initiateTest = async () => {
    if (connectedBLEMachines.size === 0) {
      setError('No machines connected');
      return;
    }

    const machineIds = Array.from(connectedBLEMachines.keys());
    
    // Clear stored farmer IDs and weights for new test
    setMachineFarmerIds(new Map());
    setMachineWeights(new Map());

    // Check which machines need manual farmer ID input (default is Manual = false)
    const manualFarmerIdMachines = machineIds.filter(id => !(machineFarmerIdMode.get(id) ?? false));
    
    // Check which machines need manual weight input (default is Auto = true)
    const manualWeightMachines = machineIds.filter(id => !(machineWeighingScaleMode.get(id) ?? true));

    setPendingTestMachines(machineIds);

    // If any machine needs manual Farmer ID, show dialog
    if (manualFarmerIdMachines.length > 0) {
      setShowFarmerIdDialog(true);
      return;
    }

    // If any machine needs manual Weight, show dialog
    if (manualWeightMachines.length > 0) {
      setShowWeightDialog(true);
      return;
    }

    // All machines are in Auto mode, proceed with test
    await executeTest(machineIds);
  };

  // Execute the actual test after dialogs are completed
  const executeTest = async (machineIds: string[], farmerIds?: Map<string, string>, weights?: Map<string, string>) => {
    // Use passed values or fall back to state (passed values avoid async state issues)
    const finalFarmerIds = farmerIds || machineFarmerIds;
    const finalWeights = weights || machineWeights;
    
    // Clear previous test state (matching Flutter)
    setMachinesWithDataReceived(new Set());
    setCurrentTestMachines(machineIds);
    
    setIsTestRunning(true);
    setTestElapsedSeconds(0);
    testTimerRef.current = setInterval(() => setTestElapsedSeconds(s => s + 1), 1000);

    console.log(`🧪 [Test] Starting test for ${machineIds.length} machine(s):`, machineIds);

    // Send test command to all machines
    for (const machineId of machineIds) {
      const farmerId = finalFarmerIds.get(machineId) || '1';
      const weight = parseFloat(finalWeights.get(machineId) || '1') || 1;
      const testHex = buildTestCommand(selectedChannel, farmerId, weight);
      
      // Send to all machines using SENDHEXALL
      if (sendDongleCommand) {
        await sendDongleCommand(`SENDHEXALL,${testHex}`);
        break; // SENDHEXALL sends to all, so only need to send once
      }
    }
    
    setSuccess(`Test sent to ${connectedBLEMachines.size} machine(s)!`);
  };

  // Handle farmer ID dialog completion
  const handleFarmerIdDialogComplete = (farmerIds: Map<string, string>) => {
    setMachineFarmerIds(farmerIds);
    setShowFarmerIdDialog(false);
    
    // Store farmer IDs in ref for use after weight dialog (avoids async state issues)
    pendingFarmerIdsRef.current = farmerIds;

    // Check if weight dialog is needed
    const machineIds = Array.from(connectedBLEMachines.keys());
    const manualWeightMachines = machineIds.filter(id => !(machineWeighingScaleMode.get(id) ?? true));

    if (manualWeightMachines.length > 0) {
      setShowWeightDialog(true);
    } else {
      // Pass farmer IDs directly to avoid async state issues
      executeTest(pendingTestMachines, farmerIds, new Map());
    }
  };

  // Handle weight dialog completion
  const handleWeightDialogComplete = (weights: Map<string, string>) => {
    setMachineWeights(weights);
    setShowWeightDialog(false);
    // Pass farmer IDs from ref and weights directly to avoid async state issues
    executeTest(pendingTestMachines, pendingFarmerIdsRef.current, weights);
  };

  const handleTest = async () => {
    await initiateTest();
  };

  const handleStopTest = () => {
    setIsTestRunning(false);
    setTestElapsedSeconds(0);
    if (testTimerRef.current) { clearInterval(testTimerRef.current); testTimerRef.current = null; }
  };

  const handleOk = async () => {
    // OK command: 40 04 01 04 00 41
    const sent = await sendToAllMachines('400401040041');
    if (sent) setSuccess(`OK sent to ${connectedBLEMachines.size} machine(s)!`);
  };

  const handleCancel = async () => {
    // Cancel command: 40 04 01 0A 00 4F
    const sent = await sendToAllMachines('4004010A004F');
    if (sent) setSuccess(`Cancel sent to ${connectedBLEMachines.size} machine(s)!`);
    handleStopTest();
  };

  const handleClean = async () => {
    // Clean command: 40 04 09 00 0A 47
    const sent = await sendToAllMachines('400409000A47');
    if (sent) setSuccess(`Clean sent to ${connectedBLEMachines.size} machine(s)!`);
  };

  // Computed reading history for current machine (matching Flutter's _currentReadingHistory getter)
  const readingHistory = useMemo((): MilkReading[] => {
    if (selectedMachineId) {
      if (machineReadingHistory.has(selectedMachineId)) {
        return machineReadingHistory.get(selectedMachineId)!;
      }
      const normalized = normalizeId(selectedMachineId);
      if (machineReadingHistory.has(normalized)) {
        return machineReadingHistory.get(normalized)!;
      }
    }
    for (const [, readings] of machineReadingHistory) {
      if (readings.length > 0) return readings;
    }
    return [];
  }, [selectedMachineId, machineReadingHistory, normalizeId]);

  // History navigation
  const goToPreviousReading = () => {
    if (historyIndex < readingHistory.length - 1) {
      setHistoryIndex(h => h + 1);
      setIsViewingHistory(true);
    }
  };

  const goToNextReading = () => {
    if (historyIndex > 0) {
      setHistoryIndex(h => h - 1);
      if (historyIndex - 1 === 0) setIsViewingHistory(false);
    }
  };

  const goToLiveReading = () => {
    setHistoryIndex(0);
    setIsViewingHistory(false);
  };

  // Displayed reading
  const displayedReading = useMemo(() => {
    if (isViewingHistory && readingHistory.length > 0) {
      const idx = readingHistory.length - 1 - historyIndex;
      return readingHistory[Math.max(0, Math.min(idx, readingHistory.length - 1))] || emptyReading;
    }
    if (selectedMachineId) {
      if (machineReadings.has(selectedMachineId)) {
        return machineReadings.get(selectedMachineId)!;
      }
      const normalized = normalizeId(selectedMachineId);
      if (machineReadings.has(normalized)) {
        return machineReadings.get(normalized)!;
      }
    }
    if (machineReadings.size === 1) {
      return Array.from(machineReadings.values())[0];
    }
    return emptyReading;
  }, [isViewingHistory, readingHistory, historyIndex, selectedMachineId, machineReadings, normalizeId]);

  // Format functions
  const formatFarmerId = (id: string) => id.replace(/^0+/, '') || '0';
  const formatTimestamp = (date?: Date) => {
    if (!date) return '--';
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    return isToday ? `Today ${timeStr}` : `${date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })} ${timeStr}`;
  };
  const getTodayDateString = () => new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  // Debug: Log context state changes
  useEffect(() => {
    console.log('🎛️ [Control Panel] Context State:', {
      connectedPort: !!connectedPort,
      isDongleVerified,
      connectedBLEMachines: Array.from(connectedBLEMachines),
      selectedMachineId,
      connectedMachinesCount: connectedMachines.length,
    });
  }, [connectedPort, isDongleVerified, connectedBLEMachines, selectedMachineId, connectedMachines]);

  // Initial load
  useEffect(() => {
    fetchMachineDetails();
    return () => { if (testTimerRef.current) clearInterval(testTimerRef.current); };
  }, [fetchMachineDetails]);

  if (loading) return <FullScreenLoader />;

  if (!machine) {
    return (
      <div className="fixed inset-0 bg-[#060a13] flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-400/70 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-white/80">Machine Not Found</h2>
          <p className="text-white/30 text-sm mt-2 mb-6">The machine could not be loaded</p>
          <button onClick={() => router.back()} className="px-5 py-2.5 bg-white/[0.06] hover:bg-white/[0.1] text-white/70 rounded-xl text-sm font-medium transition-colors ring-1 ring-white/[0.08]">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#060a13] text-white overflow-hidden">
      {/* Subtle ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 left-1/4 w-[600px] h-[600px] bg-emerald-500/[0.02] rounded-full blur-[160px]" />
        <div className="absolute -bottom-40 right-1/3 w-[500px] h-[500px] bg-sky-500/[0.02] rounded-full blur-[160px]" />
      </div>

      {/* ===== TOP BAR ===== */}
      <header className="relative z-40 flex-shrink-0 h-14 flex items-center justify-between px-3 lg:px-5 bg-white/[0.02] backdrop-blur-2xl border-b border-white/[0.06]">
        {/* Left cluster */}
        <div className="flex items-center gap-2.5">
          <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/[0.05] hover:bg-white/[0.1] transition-colors">
            <ArrowLeft className="w-4 h-4 text-white/70" />
          </button>
          <div className="hidden sm:block h-5 w-px bg-white/[0.08]" />
          <div className="hidden sm:flex flex-col">
            <span className="text-[13px] font-semibold text-white/90 leading-none tracking-tight">Control Panel</span>
            <span className="text-[10px] text-white/35 leading-tight mt-0.5">{machine.machineName} &middot; {getTodayDateString()}</span>
          </div>
          <button onClick={() => setShowSettingsPanel(true)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors" title="Settings">
            <Settings className="w-3.5 h-3.5 text-white/40" />
          </button>
          {/* Channel Selector */}
          <div className="relative group">
            <button className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-xs font-medium ${
              selectedChannel === 'CH1' ? 'bg-emerald-500/[0.08] border-emerald-500/20 text-emerald-400'
              : selectedChannel === 'CH2' ? 'bg-sky-500/[0.08] border-sky-500/20 text-sky-400'
              : 'bg-amber-500/[0.08] border-amber-500/20 text-amber-400'
            }`}>
              <span>{selectedChannel === 'CH1' ? '🐄' : selectedChannel === 'CH2' ? '🐃' : '🔀'}</span>
              <span>{selectedChannel === 'CH1' ? 'Cow' : selectedChannel === 'CH2' ? 'Buffalo' : 'Mixed'}</span>
              <ChevronRight className="w-3 h-3 opacity-50 rotate-90" />
            </button>
            <div className="absolute left-0 top-full mt-1 min-w-[140px] py-1 bg-[#111827] rounded-xl border border-white/[0.1] shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
              {(['CH1', 'CH2', 'CH3'] as const).map((ch) => (
                <button key={ch} onClick={() => setSelectedChannel(ch)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors ${
                    selectedChannel === ch ? 'bg-white/[0.06] text-white' : 'text-white/50 hover:bg-white/[0.04]'
                  }`}>
                  <span>{ch === 'CH1' ? '🐄' : ch === 'CH2' ? '🐃' : '🔀'}</span>
                  <span className="font-medium">{ch === 'CH1' ? 'Cow' : ch === 'CH2' ? 'Buffalo' : 'Mixed'}</span>
                  {selectedChannel === ch && <Check className="w-3 h-3 ml-auto text-emerald-400" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center - History Navigator */}
        <div className="flex items-center gap-1">
          {readingHistory.length > 1 && (
            <button onClick={goToPreviousReading} disabled={historyIndex >= readingHistory.length - 1}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/[0.06] disabled:opacity-20 transition-colors">
              <ChevronLeft className="w-4 h-4 text-white/60" />
            </button>
          )}
          <button onClick={goToLiveReading}
            className={`px-4 py-1 rounded-full text-[11px] font-bold tracking-[0.15em] uppercase transition-all ${
              isViewingHistory
                ? 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/25'
                : 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/25'
            }`}>
            {isViewingHistory ? `${historyIndex + 1} / ${readingHistory.length}` : '\u25CF LIVE'}
          </button>
          {readingHistory.length > 1 && (
            <button onClick={goToNextReading} disabled={historyIndex <= 0}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/[0.06] disabled:opacity-20 transition-colors">
              <ChevronRight className="w-4 h-4 text-white/60" />
            </button>
          )}
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-2">
          {/* Machine navigation arrows */}
          {connectedBLEMachines.size > 1 && (
            <button onClick={() => {
              const ids = Array.from(connectedBLEMachines);
              const idx = ids.indexOf(selectedMachineId || '');
              setSelectedMachineId(ids[idx <= 0 ? ids.length - 1 : idx - 1]);
            }} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/[0.06] transition-colors">
              <ChevronLeft className="w-4 h-4 text-white/50" />
            </button>
          )}
          {/* Machine badge */}
          {connectedBLEMachines.size > 0 ? (
            <div className="relative group">
              <button className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                selectedMachineId && connectedBLEMachines.has(selectedMachineId)
                  ? 'bg-emerald-500/[0.08] border-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/[0.08] border-red-500/20 text-red-400'
              }`}>
                <Bluetooth className="w-3.5 h-3.5" />
                <span>M-{selectedMachineId || '--'}</span>
                {connectedBLEMachines.size > 1 && <ChevronRight className="w-3 h-3 opacity-40 rotate-90" />}
              </button>
              {connectedBLEMachines.size > 1 && (
                <div className="absolute right-0 top-full mt-1.5 min-w-[220px] py-1.5 bg-[#111827] rounded-xl border border-white/[0.1] shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
                  {Array.from(connectedBLEMachines).map((mId, index) => {
                    const isSelected = selectedMachineId === mId;
                    const lastReading = machineReadings.get(mId);
                    return (
                      <button key={mId} onClick={() => setSelectedMachineId(mId)}
                        className={`w-full px-3 py-2.5 flex items-center gap-3 transition-colors hover:bg-white/[0.06] ${isSelected ? 'bg-white/[0.04]' : ''}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ring-1 ${
                          isSelected ? 'bg-emerald-500/15 ring-emerald-500/40 text-emerald-400' : 'bg-white/[0.06] ring-white/[0.1] text-white/50'
                        }`}>{index + 1}</div>
                        <div className="flex-1 text-left">
                          <div className="text-xs font-semibold text-white/80">Machine M-{mId}</div>
                          {lastReading ? (
                            <span className="text-[10px] text-cyan-400/70">FAT {lastReading.fat.toFixed(1)} | SNF {lastReading.snf.toFixed(1)}</span>
                          ) : (
                            <span className="text-[10px] text-white/30">Connected</span>
                          )}
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] text-white/30 text-xs">
              <BluetoothOff className="w-3.5 h-3.5" />
              <span>No machines</span>
            </div>
          )}
          {connectedBLEMachines.size > 1 && (
            <button onClick={() => {
              const ids = Array.from(connectedBLEMachines);
              const idx = ids.indexOf(selectedMachineId || '');
              setSelectedMachineId(ids[idx >= ids.length - 1 ? 0 : idx + 1]);
            }} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/[0.06] transition-colors">
              <ChevronRight className="w-4 h-4 text-white/50" />
            </button>
          )}
          {/* Dongle indicator */}
          <div className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium ring-1 ${
            connectedPort && isDongleVerified
              ? 'bg-emerald-500/[0.06] text-emerald-400/80 ring-emerald-500/15'
              : 'bg-white/[0.02] text-white/30 ring-white/[0.06]'
          }`}>
            <Usb className="w-3 h-3" />
            <span>{connectedPort && isDongleVerified ? 'HUB' : 'API'}</span>
          </div>
        </div>
      </header>

      {/* Toast Messages */}
      <AnimatePresence>
        {(error || success) && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50">
            {error && <Toast type="error" message={error} onClose={() => setError('')} />}
            {success && <Toast type="success" message={success} onClose={() => setSuccess('')} />}
          </div>
        )}
      </AnimatePresence>

      {/* ===== MAIN DASHBOARD ===== */}
      <main className="relative z-10 flex-1 min-h-0 p-2.5 lg:p-3.5">
        <div className="h-full grid grid-cols-1 lg:grid-cols-[240px_1fr_240px] xl:grid-cols-[280px_1fr_280px] gap-2.5 lg:gap-3">

          {/* ========== LEFT PANEL - Primary Gauges ========== */}
          <div className="hidden lg:flex flex-col gap-2.5">
            <PrimaryGaugeCard title="FAT" value={displayedReading.fat} unit="%" color="amber" maxValue={12} icon={<Droplet className="w-5 h-5" />} />
            <PrimaryGaugeCard title="SNF" value={displayedReading.snf} unit="%" color="sky" maxValue={15} icon={<Gauge className="w-5 h-5" />} />
            <PrimaryGaugeCard title="CLR" value={displayedReading.clr} unit="" color="violet" maxValue={100} icon={<Beaker className="w-5 h-5" />} />
          </div>

          {/* ========== CENTER PANEL ========== */}
          <div className="flex flex-col gap-2.5 min-h-0 overflow-y-auto lg:overflow-hidden custom-scrollbar">

            {/* Mobile: primary readings row */}
            <div className="lg:hidden grid grid-cols-3 gap-2">
              <MobileGaugeCard title="FAT" value={displayedReading.fat} unit="%" color="amber" />
              <MobileGaugeCard title="SNF" value={displayedReading.snf} unit="%" color="sky" />
              <MobileGaugeCard title="CLR" value={displayedReading.clr} unit="" color="violet" />
            </div>

            {/* Info chips strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <DashInfoChip icon={<FileText className="w-3.5 h-3.5" />} label="Tests" value={todayStats.totalTests.toString()} accent="sky" />
              <DashInfoChip icon={<Zap className="w-3.5 h-3.5" />} label="Machine" value={selectedMachineId ? `M-${selectedMachineId}` : '--'} accent="emerald" />
              <DashInfoChip icon={<User className="w-3.5 h-3.5" />} label="Farmer" value={formatFarmerId(displayedReading.farmerId)} accent="cyan" />
              <DashInfoChip icon={<Award className="w-3.5 h-3.5" />} label="Bonus" value={`\u20B9${displayedReading.incentive.toFixed(0)}`} accent="violet" />
            </div>

            {/* Transaction Block */}
            <div className="bg-white/[0.025] rounded-2xl border border-white/[0.05] px-4 py-3.5 lg:py-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-center flex-1 min-w-0">
                  <div className="text-[10px] text-white/30 uppercase tracking-[0.2em] mb-1 font-medium">Quantity</div>
                  <div className="text-xl lg:text-2xl font-bold tabular-nums text-white/90">{displayedReading.quantity.toFixed(2)}<span className="text-xs text-white/30 ml-1 font-normal">L</span></div>
                </div>
                <div className="text-white/[0.12] text-xl font-extralight select-none">&times;</div>
                <div className="text-center flex-1 min-w-0">
                  <div className="text-[10px] text-white/30 uppercase tracking-[0.2em] mb-1 font-medium">Rate</div>
                  <div className="text-xl lg:text-2xl font-bold tabular-nums text-white/90">{'\u20B9'}{displayedReading.rate.toFixed(2)}<span className="text-xs text-white/30 ml-1 font-normal">/L</span></div>
                </div>
                <div className="text-white/[0.12] text-xl font-extralight select-none">=</div>
                <div className="text-center flex-1 min-w-0 bg-emerald-500/[0.06] rounded-xl py-2 ring-1 ring-emerald-500/[0.12]">
                  <div className="text-[10px] text-emerald-400/50 uppercase tracking-[0.2em] mb-1 font-medium">Total</div>
                  <div className="text-xl lg:text-2xl font-black tabular-nums text-emerald-400">{'\u20B9'}{displayedReading.totalAmount.toFixed(2)}</div>
                </div>
              </div>
            </div>

            {/* Trend Chart */}
            <div className="flex-1 min-h-[100px] bg-white/[0.025] rounded-2xl border border-white/[0.05] p-3.5 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-medium">Live Trend</span>
                  <span className="text-[10px] text-white/20">&middot; {getTodayDateString()}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-amber-400/70" /><span className="text-[9px] text-white/30">FAT</span></div>
                  <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-sky-400/70" /><span className="text-[9px] text-white/30">SNF</span></div>
                </div>
              </div>
              <div className="flex-1 min-h-0">
                {readingHistory.length > 0 ? (
                  <DashTrendChart readings={readingHistory} />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-white/15">
                    <Waves className="w-8 h-8 mb-1.5" />
                    <span className="text-[11px]">Waiting for data...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Stats Row */}
            {todayStats.totalTests > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <DashStatChip label="Total Qty" value={`${todayStats.totalQuantity.toFixed(0)}L`} icon={<Scale className="w-3 h-3" />} />
                <DashStatChip label="Revenue" value={`\u20B9${todayStats.totalAmount.toFixed(0)}`} icon={<Award className="w-3 h-3" />} />
                <DashStatChip label="Avg FAT" value={`${todayStats.avgFat.toFixed(2)}%`} icon={<TrendingUp className="w-3 h-3" />} />
                <DashStatChip label="Avg SNF" value={`${todayStats.avgSnf.toFixed(2)}%`} icon={<TrendingDown className="w-3 h-3" />} />
              </div>
            )}

            {/* Mobile: Parameters row */}
            <div className="lg:hidden">
              <div className="bg-white/[0.025] rounded-2xl border border-white/[0.05] p-3">
                <span className="text-[10px] text-white/25 uppercase tracking-[0.2em] font-medium block mb-2">Parameters</span>
                <div className="grid grid-cols-3 gap-2">
                  <MobileParamItem label="Type" value={displayedReading.milkType === 'cow' ? 'Cow' : displayedReading.milkType === 'buffalo' ? 'Buffalo' : 'Mixed'} />
                  <MobileParamItem label="Protein" value={`${displayedReading.protein.toFixed(2)}%`} />
                  <MobileParamItem label="Lactose" value={`${displayedReading.lactose.toFixed(2)}%`} />
                  <MobileParamItem label="Salt" value={`${displayedReading.salt.toFixed(2)}%`} />
                  <MobileParamItem label="Water" value={`${displayedReading.water.toFixed(2)}%`} />
                  <MobileParamItem label="Temp" value={`${displayedReading.temperature.toFixed(1)}\u00B0C`} />
                </div>
              </div>
            </div>
          </div>

          {/* ========== RIGHT PANEL - Parameters ========== */}
          <div className="hidden lg:flex flex-col gap-2.5">
            {/* Timestamp */}
            <div className="bg-white/[0.025] rounded-xl border border-white/[0.05] px-3.5 py-2.5 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-white/25" />
              <span className={`text-[11px] font-medium ${isViewingHistory ? 'text-amber-400/80' : 'text-white/40'}`}>
                {formatTimestamp(displayedReading.timestamp)}
              </span>
            </div>

            {/* Milk type badge */}
            <div className={`rounded-xl border px-3.5 py-2.5 flex items-center gap-2.5 ${
              displayedReading.milkType === 'cow' ? 'bg-emerald-500/[0.04] border-emerald-500/[0.1]'
              : displayedReading.milkType === 'buffalo' ? 'bg-sky-500/[0.04] border-sky-500/[0.1]'
              : 'bg-amber-500/[0.04] border-amber-500/[0.1]'
            }`}>
              <span className="text-base">{displayedReading.milkType === 'cow' ? '🐄' : displayedReading.milkType === 'buffalo' ? '🐃' : '🔀'}</span>
              <div>
                <div className="text-[10px] text-white/30 uppercase tracking-widest">Milk Type</div>
                <div className="text-xs font-semibold text-white/80">{displayedReading.milkType === 'cow' ? 'Cow' : displayedReading.milkType === 'buffalo' ? 'Buffalo' : 'Mixed'}</div>
              </div>
            </div>

            {/* Parameters list */}
            <div className="flex-1 bg-white/[0.025] rounded-2xl border border-white/[0.05] p-3 flex flex-col">
              <span className="text-[10px] text-white/25 uppercase tracking-[0.2em] font-medium mb-2.5 px-0.5">Analysis</span>
              <div className="flex flex-col gap-1.5 flex-1">
                <DashParamRow icon={<FlaskConical className="w-3.5 h-3.5" />} label="Protein" value={`${displayedReading.protein.toFixed(2)}%`} color="rose" />
                <DashParamRow icon={<Beaker className="w-3.5 h-3.5" />} label="Lactose" value={`${displayedReading.lactose.toFixed(2)}%`} color="pink" />
                <DashParamRow icon={<Gauge className="w-3.5 h-3.5" />} label="Salt" value={`${displayedReading.salt.toFixed(2)}%`} color="slate" />
                <DashParamRow icon={<Droplets className="w-3.5 h-3.5" />} label="Water" value={`${displayedReading.water.toFixed(2)}%`} color="teal" />
                <DashParamRow icon={<Thermometer className="w-3.5 h-3.5" />} label="Temperature" value={`${displayedReading.temperature.toFixed(1)}\u00B0C`} color="orange" />
              </div>
            </div>

            {/* Quick stats summary */}
            {todayStats.totalTests > 0 && (
              <div className="bg-white/[0.025] rounded-xl border border-white/[0.05] p-3">
                <span className="text-[10px] text-white/25 uppercase tracking-[0.2em] font-medium block mb-2 px-0.5">Ranges</span>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-white/35">FAT Range</span>
                    <span className="text-white/60 font-medium tabular-nums">{todayStats.lowestFat.toFixed(1)} - {todayStats.highestFat.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-white/35">SNF Range</span>
                    <span className="text-white/60 font-medium tabular-nums">{todayStats.lowestSnf.toFixed(1)} - {todayStats.highestSnf.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ===== BOTTOM COMMAND BAR ===== */}
      <div className="relative z-40 flex-shrink-0 h-[68px] flex items-center justify-center gap-2.5 sm:gap-3 px-3 sm:px-5 bg-white/[0.02] backdrop-blur-2xl border-t border-white/[0.06]">
        <DashCmdButton
          icon={isTestRunning ? <Timer className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          label={isTestRunning ? `${testElapsedSeconds}s` : 'Test'}
          color="emerald" onClick={isTestRunning ? undefined : handleTest} isActive={isTestRunning}
        />
        <DashCmdButton icon={<Check className="w-5 h-5" />} label="OK" color="sky" onClick={handleOk} />
        <DashCmdButton icon={<X className="w-5 h-5" />} label="Cancel" color="amber" onClick={handleCancel} />
        <DashCmdButton icon={<Droplets className="w-5 h-5" />} label="Clean" color="violet" onClick={handleClean} />

        <div className="hidden sm:block h-8 w-px bg-white/[0.06] mx-1" />

        <button
          onClick={() => router.push(`/admin/machine/${machineDbId}?tab=analytics`)}
          className="hidden sm:flex items-center gap-2 px-4 h-10 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/40 hover:text-white/60 text-xs font-medium transition-all"
        >
          <BarChart3 className="w-3.5 h-3.5" />Reports
        </button>
        <button
          onClick={() => { setMachineReadings(new Map()); }}
          className="hidden sm:flex items-center gap-2 px-3.5 h-10 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/40 hover:text-white/60 text-xs font-medium transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />Clear
        </button>
      </div>

      {/* Farmer ID Dialog */}
      <AnimatePresence>
        {showFarmerIdDialog && (
          <FarmerIdDialogComponent
            machineIds={Array.from(connectedBLEMachines.keys()).filter(id => !(machineFarmerIdMode.get(id) ?? false))}
            machineWeighingScaleMode={machineWeighingScaleMode}
            formatMachineId={formatMachineId}
            onComplete={handleFarmerIdDialogComplete}
            onCancel={() => setShowFarmerIdDialog(false)}
          />
        )}
      </AnimatePresence>

      {/* Weight Dialog */}
      <AnimatePresence>
        {showWeightDialog && (
          <WeightDialogComponent
            machineIds={Array.from(connectedBLEMachines.keys()).filter(id => !(machineWeighingScaleMode.get(id) ?? true))}
            formatMachineId={formatMachineId}
            onComplete={handleWeightDialogComplete}
            onCancel={() => setShowWeightDialog(false)}
          />
        )}
      </AnimatePresence>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettingsPanel && (
          <SettingsPanelComponent
            connectedBLEMachines={connectedBLEMachines}
            machineWeighingScaleMode={machineWeighingScaleMode}
            setMachineWeighingScaleMode={setMachineWeighingScaleMode}
            machineFarmerIdMode={machineFarmerIdMode}
            setMachineFarmerIdMode={setMachineFarmerIdMode}
            selectedChannel={selectedChannel}
            setSelectedChannel={setSelectedChannel}
            formatMachineId={formatMachineId}
            onClose={() => setShowSettingsPanel(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Sub-Components — Redesigned Dashboard UI
// ============================================================================

/** Primary gauge card — large reading display for desktop left panel */
function PrimaryGaugeCard({ title, value, unit, color, maxValue, icon }: {
  title: string; value: number; unit: string; color: string; maxValue: number; icon: React.ReactNode;
}) {
  const progress = Math.min(Math.max(value / maxValue, 0), 1);
  const colorMap: Record<string, { accent: string; bar: string; dim: string; glow: string; ring: string }> = {
    amber:  { accent: 'text-amber-400',  bar: 'bg-amber-400',  dim: 'text-amber-400/50',  glow: 'bg-amber-400/[0.04]',  ring: 'border-amber-500/[0.08]' },
    sky:    { accent: 'text-sky-400',    bar: 'bg-sky-400',    dim: 'text-sky-400/50',    glow: 'bg-sky-400/[0.04]',    ring: 'border-sky-500/[0.08]' },
    violet: { accent: 'text-violet-400', bar: 'bg-violet-400', dim: 'text-violet-400/50', glow: 'bg-violet-400/[0.04]', ring: 'border-violet-500/[0.08]' },
  };
  const c = colorMap[color] || colorMap.amber;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}
      className={`flex-1 ${c.glow} rounded-2xl border ${c.ring} p-4 flex flex-col items-center justify-center relative overflow-hidden`}
    >
      {/* Accent line at top */}
      <div className={`absolute top-0 left-0 h-[2px] ${c.bar} opacity-40 transition-all duration-700`} style={{ width: `${progress * 100}%` }} />

      {/* Header */}
      <div className="flex items-center gap-2 self-start mb-auto">
        <div className={c.accent}>{icon}</div>
        <span className={`text-[10px] font-bold uppercase tracking-[0.25em] ${c.dim}`}>{title}</span>
      </div>

      {/* Large value */}
      <div className="flex items-baseline gap-1 my-auto">
        <span className={`text-[3.2rem] leading-none font-black tabular-nums tracking-tight ${c.accent}`}>
          {value.toFixed(title === 'CLR' ? 1 : 2)}
        </span>
        {unit && <span className={`text-lg font-medium ${c.dim}`}>{unit}</span>}
      </div>

      {/* Progress bar */}
      <div className="w-full mt-auto">
        <div className="h-[3px] bg-white/[0.04] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }} animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className={`h-full ${c.bar} rounded-full opacity-50`}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[8px] text-white/15 tabular-nums">0</span>
          <span className="text-[8px] text-white/15 tabular-nums">{maxValue}</span>
        </div>
      </div>
    </motion.div>
  );
}

/** Compact gauge card for mobile */
function MobileGaugeCard({ title, value, unit, color }: {
  title: string; value: number; unit: string; color: string;
}) {
  const colorMap: Record<string, { accent: string; bg: string; ring: string }> = {
    amber:  { accent: 'text-amber-400',  bg: 'bg-amber-500/[0.06]',  ring: 'border-amber-500/[0.1]' },
    sky:    { accent: 'text-sky-400',    bg: 'bg-sky-500/[0.06]',    ring: 'border-sky-500/[0.1]' },
    violet: { accent: 'text-violet-400', bg: 'bg-violet-500/[0.06]', ring: 'border-violet-500/[0.1]' },
  };
  const c = colorMap[color] || colorMap.amber;

  return (
    <div className={`${c.bg} rounded-xl border ${c.ring} p-3 text-center`}>
      <div className="text-[9px] text-white/30 uppercase tracking-[0.2em] font-bold mb-1">{title}</div>
      <div className={`text-2xl font-black tabular-nums ${c.accent}`}>
        {value.toFixed(title === 'CLR' ? 1 : 2)}
      </div>
      {unit && <div className="text-[10px] text-white/25">{unit}</div>}
    </div>
  );
}

/** Info chip for the metrics strip */
function DashInfoChip({ icon, label, value, accent }: {
  icon: React.ReactNode; label: string; value: string; accent: string;
}) {
  const accentMap: Record<string, string> = {
    sky: 'text-sky-400/70',
    emerald: 'text-emerald-400/70',
    cyan: 'text-cyan-400/70',
    violet: 'text-violet-400/70',
  };

  return (
    <div className="bg-white/[0.025] rounded-xl border border-white/[0.05] px-3 py-2 flex items-center gap-2.5">
      <div className={accentMap[accent] || 'text-white/40'}>{icon}</div>
      <div className="min-w-0">
        <div className="text-[9px] text-white/25 uppercase tracking-[0.15em] font-medium">{label}</div>
        <div className="text-sm font-bold text-white/85 truncate tabular-nums">{value}</div>
      </div>
    </div>
  );
}

/** Stat chip for the bottom stats bar */
function DashStatChip({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white/[0.025] rounded-xl border border-white/[0.05] px-3 py-2">
      <div className="flex items-center gap-1.5 text-white/25 mb-0.5">
        {icon}
        <span className="text-[9px] uppercase tracking-wider font-medium">{label}</span>
      </div>
      <span className="text-sm font-bold text-white/80 tabular-nums">{value}</span>
    </div>
  );
}

/** Parameter row for the right panel */
function DashParamRow({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: string; color: string;
}) {
  const colorMap: Record<string, { icon: string; value: string }> = {
    rose:   { icon: 'text-rose-400/60',   value: 'text-rose-300/80' },
    pink:   { icon: 'text-pink-400/60',   value: 'text-pink-300/80' },
    slate:  { icon: 'text-slate-400/60',  value: 'text-slate-300/80' },
    teal:   { icon: 'text-teal-400/60',   value: 'text-teal-300/80' },
    orange: { icon: 'text-orange-400/60', value: 'text-orange-300/80' },
  };
  const c = colorMap[color] || colorMap.slate;

  return (
    <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
      <div className={c.icon}>{icon}</div>
      <span className="text-[11px] text-white/35 flex-1">{label}</span>
      <span className={`text-[12px] font-semibold tabular-nums ${c.value}`}>{value}</span>
    </div>
  );
}

/** Mobile parameter item */
function MobileParamItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center py-1.5">
      <div className="text-[9px] text-white/25 uppercase tracking-wider">{label}</div>
      <div className="text-xs font-semibold text-white/70 tabular-nums mt-0.5">{value}</div>
    </div>
  );
}

/** Command button for the bottom bar */
function DashCmdButton({ icon, label, color, onClick, isActive }: {
  icon: React.ReactNode; label: string; color: string; onClick?: () => void; isActive?: boolean;
}) {
  const colorMap: Record<string, { base: string; active: string; text: string; ring: string }> = {
    emerald: { base: 'bg-emerald-500/[0.08] hover:bg-emerald-500/[0.15]', active: 'bg-emerald-500/20', text: 'text-emerald-400', ring: 'ring-emerald-500/20' },
    sky:     { base: 'bg-sky-500/[0.08] hover:bg-sky-500/[0.15]',         active: 'bg-sky-500/20',     text: 'text-sky-400',     ring: 'ring-sky-500/20' },
    amber:   { base: 'bg-amber-500/[0.08] hover:bg-amber-500/[0.15]',     active: 'bg-amber-500/20',   text: 'text-amber-400',   ring: 'ring-amber-500/20' },
    violet:  { base: 'bg-violet-500/[0.08] hover:bg-violet-500/[0.15]',   active: 'bg-violet-500/20',  text: 'text-violet-400',  ring: 'ring-violet-500/20' },
  };
  const c = colorMap[color] || colorMap.emerald;

  return (
    <motion.button
      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
      onClick={onClick} disabled={isActive}
      className={`flex items-center gap-2 px-5 sm:px-6 py-2.5 rounded-xl ring-1 ${c.ring} ${isActive ? c.active : c.base} ${c.text} font-semibold text-sm transition-all ${isActive ? 'animate-pulse' : ''}`}
    >
      {icon}
      <span className="tracking-wide hidden sm:inline">{label}</span>
      <span className="tracking-wide sm:hidden text-xs">{label}</span>
    </motion.button>
  );
}

/** Trend chart — bar chart showing FAT and SNF history */
function DashTrendChart({ readings }: { readings: MilkReading[] }) {
  const last20 = readings.slice(-20);
  if (last20.length < 2) {
    return <div className="flex items-center justify-center h-full text-white/20 text-[11px]">Need 2+ readings</div>;
  }

  const maxFat = Math.max(...last20.map(r => r.fat), 8);
  const maxSnf = Math.max(...last20.map(r => r.snf), 12);
  const maxVal = Math.max(maxFat, maxSnf) * 1.1;

  return (
    <div className="w-full h-full flex items-end gap-[3px] px-1">
      {last20.map((r, i) => (
        <div key={i} className="flex-1 flex gap-[1px] items-end h-full" title={`FAT ${r.fat.toFixed(2)}% | SNF ${r.snf.toFixed(2)}%`}>
          <div
            className="flex-1 bg-amber-400/60 rounded-t-sm transition-all duration-300 hover:bg-amber-400/80 min-h-[2px]"
            style={{ height: `${Math.max((r.fat / maxVal) * 100, 2)}%` }}
          />
          <div
            className="flex-1 bg-sky-400/60 rounded-t-sm transition-all duration-300 hover:bg-sky-400/80 min-h-[2px]"
            style={{ height: `${Math.max((r.snf / maxVal) * 100, 2)}%` }}
          />
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Dialog Components — Modernized styling, same functionality
// ============================================================================

function FarmerIdDialogComponent({
  machineIds, machineWeighingScaleMode, formatMachineId, onComplete, onCancel
}: {
  machineIds: string[]; machineWeighingScaleMode: Map<string, boolean>;
  formatMachineId: (id: string) => string;
  onComplete: (farmerIds: Map<string, string>) => void; onCancel: () => void;
}) {
  const [tempFarmerIds, setTempFarmerIds] = useState<Map<string, string>>(new Map());
  const allFilled = machineIds.every(id => (tempFarmerIds.get(id) || '').trim() !== '');
  const hasManualWeight = machineIds.some(id => !(machineWeighingScaleMode.get(id) ?? true));
  const handleSubmit = () => { if (allFilled) onComplete(tempFarmerIds); };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#111827] rounded-2xl border border-white/[0.1] shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-white/[0.06] bg-emerald-500/[0.04]">
          <div className="p-2 rounded-xl bg-emerald-500/10"><User className="w-5 h-5 text-emerald-400" /></div>
          <h3 className="text-base font-bold text-white">Enter Farmer IDs</h3>
        </div>
        <div className="p-4 space-y-3.5 max-h-[60vh] overflow-auto">
          {machineIds.map((machineId, index) => (
            <div key={machineId} className="space-y-1.5">
              <label className="text-xs font-semibold text-white/50">Machine M-{formatMachineId(machineId)}</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400/60" />
                <input type="number" placeholder="Enter Farmer ID" autoFocus={index === 0}
                  value={tempFarmerIds.get(machineId) || ''}
                  onChange={(e) => { const m = new Map(tempFarmerIds); m.set(machineId, e.target.value); setTempFarmerIds(m); }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && allFilled) handleSubmit(); }}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-white/25 focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/30 outline-none transition-all text-sm" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-3 p-4 border-t border-white/[0.06]">
          <button onClick={onCancel} className="flex-1 py-2.5 px-4 rounded-xl border border-white/[0.1] text-white/50 hover:bg-white/[0.04] transition-colors text-sm font-medium">Cancel</button>
          <button onClick={handleSubmit} disabled={!allFilled}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${allFilled ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-white/[0.06] text-white/25 cursor-not-allowed'}`}>
            {hasManualWeight ? 'Next' : 'Start Test'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function WeightDialogComponent({
  machineIds, formatMachineId, onComplete, onCancel
}: {
  machineIds: string[]; formatMachineId: (id: string) => string;
  onComplete: (weights: Map<string, string>) => void; onCancel: () => void;
}) {
  const [tempWeights, setTempWeights] = useState<Map<string, string>>(new Map());
  const allFilled = machineIds.every(id => (tempWeights.get(id) || '').trim() !== '');
  const handleSubmit = () => { if (allFilled) onComplete(tempWeights); };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#111827] rounded-2xl border border-white/[0.1] shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-white/[0.06] bg-cyan-500/[0.04]">
          <div className="p-2 rounded-xl bg-cyan-500/10"><Scale className="w-5 h-5 text-cyan-400" /></div>
          <h3 className="text-base font-bold text-white">Enter Weights</h3>
        </div>
        <div className="p-4 space-y-3.5 max-h-[60vh] overflow-auto">
          {machineIds.map((machineId, index) => (
            <div key={machineId} className="space-y-1.5">
              <label className="text-xs font-semibold text-white/50">Machine M-{formatMachineId(machineId)}</label>
              <div className="relative">
                <Scale className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400/60" />
                <input type="number" step="0.01" placeholder="Enter Weight" autoFocus={index === 0}
                  value={tempWeights.get(machineId) || ''}
                  onChange={(e) => { const m = new Map(tempWeights); m.set(machineId, e.target.value); setTempWeights(m); }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && allFilled) handleSubmit(); }}
                  className="w-full pl-10 pr-12 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-white/25 focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/30 outline-none transition-all text-sm" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 text-xs font-medium">kg</span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-3 p-4 border-t border-white/[0.06]">
          <button onClick={onCancel} className="flex-1 py-2.5 px-4 rounded-xl border border-white/[0.1] text-white/50 hover:bg-white/[0.04] transition-colors text-sm font-medium">Cancel</button>
          <button onClick={handleSubmit} disabled={!allFilled}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${allFilled ? 'bg-cyan-500 text-white hover:bg-cyan-600' : 'bg-white/[0.06] text-white/25 cursor-not-allowed'}`}>
            Start Test
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SettingsPanelComponent({
  connectedBLEMachines, machineWeighingScaleMode, setMachineWeighingScaleMode,
  machineFarmerIdMode, setMachineFarmerIdMode, selectedChannel, setSelectedChannel,
  formatMachineId, onClose
}: {
  connectedBLEMachines: Set<string>;
  machineWeighingScaleMode: Map<string, boolean>;
  setMachineWeighingScaleMode: (map: Map<string, boolean>) => void;
  machineFarmerIdMode: Map<string, boolean>;
  setMachineFarmerIdMode: (map: Map<string, boolean>) => void;
  selectedChannel: 'CH1' | 'CH2' | 'CH3';
  setSelectedChannel: (channel: 'CH1' | 'CH2' | 'CH3') => void;
  formatMachineId: (id: string) => string;
  onClose: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}
        className="bg-[#111827] rounded-2xl border border-white/[0.1] shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-white/[0.06] bg-violet-500/[0.04]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-500/10"><Settings className="w-5 h-5 text-violet-400" /></div>
            <h3 className="text-base font-bold text-white">Test Settings</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.06] transition-colors">
            <X className="w-4 h-4 text-white/40" />
          </button>
        </div>
        <div className="p-4 space-y-3 max-h-[60vh] overflow-auto">
          {Array.from(connectedBLEMachines).map((machineId) => (
            <div key={machineId} className="bg-white/[0.03] rounded-xl p-3.5 space-y-3">
              <div className="flex items-center gap-2">
                <Bluetooth className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-sm font-bold text-white/80">Machine M-{formatMachineId(machineId)}</span>
              </div>
              {/* Weighing Scale Mode */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-white/50"><Scale className="w-3.5 h-3.5" /><span>Weighing Scale</span></div>
                <div className="flex gap-1">
                  <button onClick={() => { const m = new Map(machineWeighingScaleMode); m.set(machineId, true); setMachineWeighingScaleMode(m); }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${(machineWeighingScaleMode.get(machineId) ?? true) ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30' : 'bg-white/[0.04] text-white/40 hover:bg-white/[0.06]'}`}>Auto</button>
                  <button onClick={() => { const m = new Map(machineWeighingScaleMode); m.set(machineId, false); setMachineWeighingScaleMode(m); }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${!(machineWeighingScaleMode.get(machineId) ?? true) ? 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30' : 'bg-white/[0.04] text-white/40 hover:bg-white/[0.06]'}`}>Manual</button>
                </div>
              </div>
              {/* Farmer ID Mode */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-white/50"><User className="w-3.5 h-3.5" /><span>Farmer ID</span></div>
                <div className="flex gap-1">
                  <button onClick={() => { const m = new Map(machineFarmerIdMode); m.set(machineId, true); setMachineFarmerIdMode(m); }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${(machineFarmerIdMode.get(machineId) ?? false) ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30' : 'bg-white/[0.04] text-white/40 hover:bg-white/[0.06]'}`}>Auto</button>
                  <button onClick={() => { const m = new Map(machineFarmerIdMode); m.set(machineId, false); setMachineFarmerIdMode(m); }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${!(machineFarmerIdMode.get(machineId) ?? false) ? 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30' : 'bg-white/[0.04] text-white/40 hover:bg-white/[0.06]'}`}>Manual</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-white/[0.06]">
          <button onClick={onClose} className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 transition-all">Done</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
