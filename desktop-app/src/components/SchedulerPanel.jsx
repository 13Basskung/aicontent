import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Clock, Play, Pause, Calendar, RefreshCw, 
  CheckCircle, AlertCircle, Zap, Globe, ChevronDown
} from 'lucide-react';

// Timezone configuration with emoji flags (simple and reliable)
const TIMEZONES = [
  { id: 'Asia/Bangkok', label: 'Thailand', gmt: 'GMT+7', offset: 7 },
  { id: 'Europe/London', label: 'UK', gmt: 'GMT+0', offset: 0 },
  { id: 'Asia/Shanghai', label: 'China', gmt: 'GMT+8', offset: 8 },
  { id: 'Asia/Seoul', label: 'South Korea', gmt: 'GMT+9', offset: 9 },
  { id: 'Asia/Taipei', label: 'Taiwan', gmt: 'GMT+8', offset: 8 },
];

// Flag component using simple colored rectangles (guaranteed to work)
function FlagIcon({ timezone, size = 'md' }) {
  const sizeClass = size === 'sm' ? 'w-5 h-3' : 'w-6 h-4';
  
  const flags = {
    'Asia/Bangkok': ( // Thailand
      <div className={`${sizeClass} rounded-sm overflow-hidden flex flex-col`}>
        <div className="flex-1 bg-red-600"></div>
        <div className="flex-1 bg-white"></div>
        <div className="flex-[2] bg-blue-900"></div>
        <div className="flex-1 bg-white"></div>
        <div className="flex-1 bg-red-600"></div>
      </div>
    ),
    'Europe/London': ( // UK
      <div className={`${sizeClass} rounded-sm overflow-hidden bg-blue-800 relative`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full h-1 bg-white absolute"></div>
          <div className="h-full w-1 bg-white absolute"></div>
          <div className="w-full h-0.5 bg-red-600 absolute"></div>
          <div className="h-full w-0.5 bg-red-600 absolute"></div>
        </div>
      </div>
    ),
    'Asia/Shanghai': ( // China
      <div className={`${sizeClass} rounded-sm overflow-hidden bg-red-600 flex items-center justify-start pl-1`}>
        <span className="text-yellow-400 text-[8px]">★</span>
      </div>
    ),
    'Asia/Seoul': ( // South Korea
      <div className={`${sizeClass} rounded-sm overflow-hidden bg-white flex items-center justify-center`}>
        <div className="w-2 h-2 rounded-full bg-gradient-to-b from-red-500 to-blue-600"></div>
      </div>
    ),
    'Asia/Taipei': ( // Taiwan
      <div className={`${sizeClass} rounded-sm overflow-hidden bg-red-600`}>
        <div className="w-1/2 h-1/2 bg-blue-800 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
        </div>
      </div>
    ),
  };
  
  return flags[timezone] || <div className={`${sizeClass} rounded-sm bg-gray-500`}></div>;
}

// Day names in Thai
const DAY_NAMES = {
  sun: 'อาทิตย์',
  mon: 'จันทร์',
  tue: 'อังคาร',
  wed: 'พุธ',
  thu: 'พฤหัส',
  fri: 'ศุกร์',
  sat: 'เสาร์'
};

function SchedulerPanel({ keyData, instances }) {
  const [schedules, setSchedules] = useState([]);
  const [todaySchedules, setTodaySchedules] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastTrigger, setLastTrigger] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastDay, setLastDay] = useState(new Date().getDay());
  const [executionStatus, setExecutionStatus] = useState(null);
  const [userTimezone, setUserTimezone] = useState('Asia/Bangkok');
  const [isTimezoneDropdownOpen, setIsTimezoneDropdownOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null); // null = show today, string = show selected day
  const dropdownRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 256 });

  // Update current time every second + check day change
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      
      // Auto-refresh when day changes
      if (now.getDay() !== lastDay) {
        console.log('📅 Day changed - refreshing schedule');
        setLastDay(now.getDay());
        loadSchedules();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [lastDay]);

  // Load schedules on mount + fetch timezone
  useEffect(() => {
    loadSchedules();
    loadTimezone();
  }, [keyData]);

  // Smart-refresh: check for changes every 30 seconds
  useEffect(() => {
    const syncInterval = setInterval(async () => {
      if (window.electronAPI?.scheduler && keyData?.userId) {
        const result = await window.electronAPI.scheduler.checkChanges(keyData.userId);
        
        // Always update timezone (user may have changed it in Web App)
        if (result.timezone && result.timezone !== userTimezone) {
          console.log('🌍 Timezone changed:', result.timezone);
          setUserTimezone(result.timezone);
        }
        
        // Update schedules only if changed
        if (result.changed) {
          console.log('🔄 Schedules changed - updating...');
          setSchedules(result.schedules);
          // Filter today's schedules
          const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
          const todayCode = days[new Date().getDay()];
          setTodaySchedules(result.schedules.filter(s => s.day === todayCode));
        }
      }
    }, 30000);
    
    return () => clearInterval(syncInterval);
  }, [keyData, userTimezone]);

  // Listen for scheduler events
  useEffect(() => {
    if (window.electronAPI?.scheduler) {
      window.electronAPI.scheduler.onTrigger((data) => {
        console.log('⏰ Scheduler triggered:', data);
        setLastTrigger(data);
      });
      
      window.electronAPI.scheduler.onUpdate((data) => {
        console.log('📅 Schedules updated:', data);
        setSchedules(data);
      });
      
      // Listen for execution status
      window.electronAPI.scheduler.onStatus?.((data) => {
        console.log('📊 Execution status:', data);
        setExecutionStatus(data);
        // Clear status after 10 seconds
        setTimeout(() => setExecutionStatus(null), 10000);
      });
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsTimezoneDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function loadTimezone() {
    try {
      if (window.electronAPI?.scheduler && keyData?.userId) {
        const tz = await window.electronAPI.scheduler.getTimezone(keyData.userId);
        setUserTimezone(tz);
        console.log('🌍 User timezone:', tz);
      }
    } catch (error) {
      console.error('Load timezone error:', error);
    }
  }

  async function handleTimezoneChange(newTimezone) {
    setUserTimezone(newTimezone);
    setIsTimezoneDropdownOpen(false);
    // Save to Firestore via IPC
    if (window.electronAPI?.scheduler && keyData?.userId) {
      await window.electronAPI.scheduler.setTimezone(keyData.userId, newTimezone);
      console.log('🌍 Timezone saved:', newTimezone);
    }
  }

  async function loadSchedules() {
    setLoading(true);
    try {
      if (window.electronAPI?.scheduler) {
        const all = await window.electronAPI.scheduler.getAll(keyData.userId);
        setSchedules(all);
        
        const today = await window.electronAPI.scheduler.getToday(keyData.userId);
        setTodaySchedules(today);
      }
    } catch (error) {
      console.error('Load schedules error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleScheduler() {
    if (isRunning) {
      await window.electronAPI?.scheduler.stop();
      setIsRunning(false);
    } else {
      await window.electronAPI?.scheduler.start(keyData.userId, instances);
      setIsRunning(true);
    }
  }

  // Get current time in user's timezone
  function getTimeInTimezone() {
    return new Date(currentTime.toLocaleString('en-US', { timeZone: userTimezone }));
  }

  function getCurrentDayCode() {
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const tzTime = getTimeInTimezone();
    return days[tzTime.getDay()];
  }

  function formatTime(date) {
    // Format time in user's timezone
    return date.toLocaleTimeString('th-TH', { 
      timeZone: userTimezone,
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  }

  // Get current time for selected timezone using offset calculation
  function getTimeForTimezone() {
    const tz = TIMEZONES.find(t => t.id === userTimezone) || TIMEZONES[0];
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const tzTime = new Date(utc + (tz.offset * 3600000));
    return tzTime;
  }

  function formatTimeWithSeconds() {
    const tzTime = getTimeForTimezone();
    const hours = String(tzTime.getHours()).padStart(2, '0');
    const minutes = String(tzTime.getMinutes()).padStart(2, '0');
    const seconds = String(tzTime.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  function getTimezoneLabel() {
    const tz = TIMEZONES.find(t => t.id === userTimezone);
    return tz ? `${tz.label} (${tz.gmt})` : 'Thailand (GMT+7)';
  }

  function isUpcoming(slot) {
    const now = formatTime(currentTime);
    return slot.start > now;
  }

  function isPast(slot) {
    const now = formatTime(currentTime);
    return slot.start < now;
  }

  // Calculate countdown to slot time (returns { hours, minutes, seconds })
  function getCountdown(slot) {
    const now = new Date();
    const [hours, minutes] = slot.start.split(':').map(Number);
    
    // Create target time in user timezone
    const target = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
    target.setHours(hours, minutes, 0, 0);
    
    // Get current time in user timezone
    const current = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
    
    const diff = target.getTime() - current.getTime();
    if (diff <= 0) return null;
    
    const totalSeconds = Math.floor(diff / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    
    return { hours: h, minutes: m, seconds: s };
  }

  function formatCountdown(countdown) {
    if (!countdown) return '';
    const { hours, minutes, seconds } = countdown;
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }

  // Group schedules by day
  const schedulesByDay = schedules.reduce((acc, slot) => {
    if (!acc[slot.day]) acc[slot.day] = [];
    acc[slot.day].push(slot);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Header with current time and toggle */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Scheduler</h2>
              <p className="text-white/50 text-sm">
                {DAY_NAMES[getCurrentDayCode()]}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Timezone Selector - NEW SIMPLE VERSION */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsTimezoneDropdownOpen(!isTimezoneDropdownOpen)}
                className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 text-sm text-yellow-400 font-bold cursor-pointer w-56 border border-yellow-500/20 hover:border-yellow-500/40 transition-colors"
              >
                <FlagIcon timezone={userTimezone} />
                <span className="flex-1 text-left">{getTimezoneLabel()}</span>
                <ChevronDown className={`w-4 h-4 text-yellow-500 transition-transform ${isTimezoneDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {/* Dropdown - Selected timezone shows first */}
              {isTimezoneDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-slate-900/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl overflow-hidden z-50">
                  {/* Sort: selected timezone first, then others */}
                  {[...TIMEZONES].sort((a, b) => {
                    if (a.id === userTimezone) return -1;
                    if (b.id === userTimezone) return 1;
                    return 0;
                  }).map(tz => (
                    <button
                      key={tz.id}
                      onClick={() => {
                        setUserTimezone(tz.id);
                        setIsTimezoneDropdownOpen(false);
                        // Save to Firestore
                        if (window.electronAPI?.scheduler && keyData?.userId) {
                          window.electronAPI.scheduler.setTimezone(keyData.userId, tz.id);
                        }
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors ${
                        userTimezone === tz.id ? 'bg-yellow-500/20 text-yellow-300 font-bold' : 'text-white'
                      }`}
                    >
                      <FlagIcon timezone={tz.id} />
                      <span className="text-sm font-medium">{tz.label} ({tz.gmt})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Current Time Display */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
              <Clock className="w-4 h-4 text-green-400" />
              <span className="font-mono font-bold text-lg text-white">
                {formatTimeWithSeconds()}
              </span>
            </div>
            
            <button
              onClick={loadSchedules}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 transition"
              title="รีเฟรช"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            
            <button
              onClick={toggleScheduler}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${
                isRunning 
                  ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400' 
                  : 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>หยุด Auto-Run</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>เริ่ม Auto-Run</span>
                </>
              )}
            </button>
          </div>
        </div>
        
        {isRunning && (
          <div className="mt-3 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <Zap className="w-4 h-4" />
              <span>Auto-Run กำลังทำงาน - จะรันอัตโนมัติตามตารางเวลา</span>
            </div>
          </div>
        )}
        
        {lastTrigger && (
          <div className="mt-3 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-center gap-2 text-yellow-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>กำลังรัน: {lastTrigger.projectName} @ {lastTrigger.time}</span>
            </div>
          </div>
        )}
        
        {executionStatus && (
          <div className={`mt-3 p-2 rounded-lg border ${
            executionStatus.status === 'success' 
              ? 'bg-green-500/10 border-green-500/20' 
              : 'bg-red-500/10 border-red-500/20'
          }`}>
            <div className={`flex items-center gap-2 text-sm ${
              executionStatus.status === 'success' ? 'text-green-400' : 'text-red-400'
            }`}>
              {executionStatus.status === 'success' ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              <span>
                {executionStatus.status === 'success' 
                  ? `✅ ${executionStatus.projectName} รันสำเร็จ!`
                  : `❌ ${executionStatus.projectName}: ${executionStatus.error}`
                }
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Today's Schedule */}
      <div className="glass rounded-xl p-4">
        <h3 className="text-white font-medium mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-purple-400" />
          ตารางวันนี้ ({DAY_NAMES[getCurrentDayCode()]})
        </h3>
        
        {loading ? (
          <div className="text-center py-4">
            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : todaySchedules.length === 0 ? (
          <div className="text-center py-4 text-white/30">
            ไม่มีตารางสำหรับวันนี้
          </div>
        ) : (
          <div className="space-y-2">
            {todaySchedules.map((slot, index) => (
              <div 
                key={index}
                className={`p-3 rounded-lg border ${
                  isPast(slot) 
                    ? 'bg-white/5 border-white/10 opacity-50' 
                    : isUpcoming(slot)
                      ? 'bg-purple-500/10 border-purple-500/30'
                      : 'bg-green-500/10 border-green-500/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`text-lg font-mono ${
                      isPast(slot) ? 'text-white/30' : 'text-white'
                    }`}>
                      {slot.start}
                    </div>
                    <div>
                      <div className={`font-medium ${
                        isPast(slot) ? 'text-white/30' : 'text-white'
                      }`}>
                        {slot.projectName}
                      </div>
                      <div className="text-xs text-white/50">
                        {slot.scenes} scenes • {slot.platforms?.length || 0} platforms
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {/* Countdown timer - show when AUTO RUN is active and slot is not past */}
                    {isRunning && !isPast(slot) && getCountdown(slot) && (
                      <span className="font-mono text-sm text-gray-500">
                        {formatCountdown(getCountdown(slot))}
                      </span>
                    )}
                    {isPast(slot) ? (
                      <CheckCircle className="w-5 h-5 text-white/30" />
                    ) : (
                      <Clock className="w-5 h-5 text-purple-400" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Weekly Overview */}
      <div className="glass rounded-xl p-4">
        <h3 className="text-white font-medium mb-3">ตารางทั้งสัปดาห์</h3>
        
        <div className="grid grid-cols-7 gap-2">
          {['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map((day) => (
            <button 
              key={day}
              onClick={() => setSelectedDay(selectedDay === day ? null : day)}
              className={`p-2 rounded-lg text-center transition cursor-pointer hover:bg-white/10 ${
                selectedDay === day
                  ? 'bg-yellow-500/20 border-2 border-yellow-500/50'
                  : day === getCurrentDayCode() 
                    ? 'bg-purple-500/20 border border-purple-500/30' 
                    : 'bg-white/5 border border-transparent'
              }`}
            >
              <div className={`text-xs font-medium mb-1 ${
                selectedDay === day 
                  ? 'text-yellow-400' 
                  : day === getCurrentDayCode() 
                    ? 'text-purple-400' 
                    : 'text-white/50'
              }`}>
                {DAY_NAMES[day]}
              </div>
              <div className="text-lg font-bold text-white">
                {schedulesByDay[day]?.length || 0}
              </div>
              <div className="text-xs text-white/30">slots</div>
            </button>
          ))}
        </div>
        
        {/* Selected Day Detail - Don't show if it's today (already shown above) */}
        {selectedDay && selectedDay !== getCurrentDayCode() && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-white font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4 text-yellow-400" />
                รายการวัน{DAY_NAMES[selectedDay]}
              </h4>
              <button 
                onClick={() => setSelectedDay(null)}
                className="text-xs text-white/50 hover:text-white px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition"
              >
                ปิด
              </button>
            </div>
            
            {(schedulesByDay[selectedDay]?.length || 0) === 0 ? (
              <div className="text-center py-4 text-white/30">
                ไม่มีตารางสำหรับวัน{DAY_NAMES[selectedDay]}
              </div>
            ) : (
              <div className="space-y-2">
                {schedulesByDay[selectedDay]?.map((slot, index) => (
                  <div 
                    key={index}
                    className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-lg font-mono text-white">
                          {slot.start}
                        </div>
                        <div>
                          <div className="font-medium text-white">
                            {slot.projectName}
                          </div>
                          <div className="text-xs text-white/50">
                            {slot.scenes} scenes • {slot.platforms?.length || 0} platforms
                          </div>
                        </div>
                      </div>
                      <Clock className="w-4 h-4 text-yellow-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SchedulerPanel;
