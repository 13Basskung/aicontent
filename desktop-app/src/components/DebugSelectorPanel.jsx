import React, { useState } from 'react';
import { 
  Search, Check, X, Target, Zap, ChevronDown, Settings, Link
} from 'lucide-react';

const ACTION_TYPES = [
  { value: 'click', label: 'คลิก', icon: '👆' },
  { value: 'fill', label: 'พิมพ์', icon: '⌨️' },
  { value: 'wait', label: 'รอ (ms)', icon: '⏱️' },
  { value: 'goto', label: 'ไปที่ URL', icon: '🔗' },
  { value: 'wait_for_element', label: 'รอให้ปรากฏ', icon: '👁️' },
  { value: 'wait_for_disappear', label: 'รอให้หายไป', icon: '🙈' },
  { value: 'wait_for_element_and_click', label: 'รอแล้วคลิก', icon: '👁️👆' },
  { value: 'click_dropdown', label: 'คลิกเปิดเมนู', icon: '📋' },
  { value: 'click_text', label: 'คลิกจากข้อความ', icon: '🔤' },
  { value: 'wait_for_element_long', label: 'รอให้ปรากฏ (นาน)', icon: '⏳' },
  { value: 'wait_and_click_long', label: 'รอให้ปรากฏแล้วคลิก (นาน)', icon: '⏳👆' },
  { value: 'wait_progress_complete', label: 'รอโหลดเสร็จ (ตรวจซีนต์)', icon: '📊' },
  { value: 'inject_prompt', label: 'ดึง Prompt', icon: '📝' },
];

function DebugSelectorPanel({ onShootToAction, onShootToOption }) {
  const [selector, setSelector] = useState('');
  const [shootValue, setShootValue] = useState('');
  const [result, setResult] = useState(null);
  
  // Shoot to Action state
  const [shootAction, setShootAction] = useState('click');
  const [showActionDropdown, setShowActionDropdown] = useState(false);

  const handleShootToAction = () => {
    if (!selector.trim()) {
      setResult({ success: false, error: 'กรุณาใส่ Selector ก่อน Shoot' });
      return;
    }

    const newStep = {
      action: shootAction,
      selector: selector.trim(),
      value: shootValue || '',
      modifiers: { preActions: [], postActions: [] }
    };

    if (onShootToAction) {
      onShootToAction(newStep);
      setResult({ success: true, action: 'shoot_action', message: `เพิ่ม Step "${shootAction}" สำเร็จ!` });
    }
  };

  const handleShootToOption = () => {
    if (!selector.trim()) {
      setResult({ success: false, error: 'กรุณาใส่ Selector ก่อน Shoot' });
      return;
    }

    if (onShootToOption) {
      onShootToOption(selector.trim());
      setResult({ success: true, action: 'shoot_option', message: 'Shoot to Option สำเร็จ!' });
    }
  };

  return (
    <div className="glass rounded-xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
          <Search className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Debug Selector</h2>
          <p className="text-white/50 text-sm">ทดสอบ Selector ก่อนใช้งานจริง</p>
        </div>
      </div>

      {/* Target Selector */}
      <div>
        <label className="block text-white/70 text-sm mb-2">Target Selector</label>
        <input
          type="text"
          value={selector}
          onChange={(e) => setSelector(e.target.value)}
          placeholder="#element-id หรือ .class-name หรือ [data-attribute]"
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 font-mono text-sm"
        />
      </div>

      {/* Value Input */}
      <div>
        <label className="block text-white/70 text-sm mb-2">Value (สำหรับ fill, wait, goto)</label>
        <input
          type="text"
          value={shootValue}
          onChange={(e) => setShootValue(e.target.value)}
          placeholder="ข้อความ, URL, หรือเวลา (ms)"
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
        />
      </div>

      {/* Result */}
      {result && (
        <div className={`p-4 rounded-lg border ${
          result.success 
            ? 'bg-green-500/10 border-green-500/30' 
            : 'bg-red-500/10 border-red-500/30'
        }`}>
          <div className="flex items-center gap-2">
            {result.success ? (
              <Check className="w-5 h-5 text-green-400" />
            ) : (
              <X className="w-5 h-5 text-red-400" />
            )}
            <span className={result.success ? 'text-green-300' : 'text-red-300'}>
              {result.message || result.error}
            </span>
          </div>
        </div>
      )}

      {/* Shoot to Action Section */}
      <div className="border-t border-white/10 pt-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-orange-400" />
          <h3 className="text-white font-semibold">Shoot to Recorder</h3>
        </div>

        {/* Action Dropdown */}
        <div className="relative mb-4">
          <label className="block text-white/70 text-xs mb-1">Action Type</label>
          <button
            onClick={() => setShowActionDropdown(!showActionDropdown)}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white text-left flex items-center justify-between"
          >
            <span>{ACTION_TYPES.find(a => a.value === shootAction)?.icon} {ACTION_TYPES.find(a => a.value === shootAction)?.label}</span>
            <ChevronDown className="w-4 h-4" />
          </button>
          {showActionDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-white/20 rounded-lg shadow-xl z-50 max-h-60 overflow-auto">
              {ACTION_TYPES.map(action => (
                <button
                  key={action.value}
                  onClick={() => {
                    setShootAction(action.value);
                    setShowActionDropdown(false);
                  }}
                  className="w-full px-3 py-2 text-left text-white/80 hover:bg-white/10 text-sm flex items-center gap-2"
                >
                  <span>{action.icon}</span>
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Shoot Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleShootToAction}
            disabled={!selector.trim()}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 rounded-lg text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Zap className="w-4 h-4" />
            ADD TO STEPS
          </button>
          <button
            onClick={handleShootToOption}
            disabled={!selector.trim()}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 rounded-lg text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Settings className="w-4 h-4" />
            SHOOT TO OPTION
          </button>
        </div>
      </div>
    </div>
  );
}

export default DebugSelectorPanel;
