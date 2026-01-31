import React, { useState, useEffect } from 'react';
import { 
  Clock, Play, Pause, Calendar, RefreshCw, 
  CheckCircle, AlertCircle, Zap
} from 'lucide-react';

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

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load schedules on mount
  useEffect(() => {
    loadSchedules();
  }, [keyData]);

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
    }
  }, []);

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

  function getCurrentDayCode() {
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    return days[currentTime.getDay()];
  }

  function formatTime(date) {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  function isUpcoming(slot) {
    const now = formatTime(currentTime);
    return slot.start > now;
  }

  function isPast(slot) {
    const now = formatTime(currentTime);
    return slot.start < now;
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
                {DAY_NAMES[getCurrentDayCode()]} {formatTime(currentTime)}:{String(currentTime.getSeconds()).padStart(2, '0')}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
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
              <span>ล่าสุด: {lastTrigger.projectName} @ {lastTrigger.time}</span>
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
                  
                  <div>
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
            <div 
              key={day}
              className={`p-2 rounded-lg text-center ${
                day === getCurrentDayCode() 
                  ? 'bg-purple-500/20 border border-purple-500/30' 
                  : 'bg-white/5'
              }`}
            >
              <div className={`text-xs font-medium mb-1 ${
                day === getCurrentDayCode() ? 'text-purple-400' : 'text-white/50'
              }`}>
                {DAY_NAMES[day]}
              </div>
              <div className="text-lg font-bold text-white">
                {schedulesByDay[day]?.length || 0}
              </div>
              <div className="text-xs text-white/30">slots</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SchedulerPanel;
