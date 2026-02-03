import React, { useState } from 'react';
import { 
  Search, MousePointer, Type, Play, Check, X, 
  Target, Zap, ChevronDown, Settings
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

function DebugSelectorPanel({ instances, onShootToAction, onShootToOption }) {
  const [selector, setSelector] = useState('');
  const [inputText, setInputText] = useState('');
  const [selectedInstance, setSelectedInstance] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [elementInfo, setElementInfo] = useState(null);
  
  // Shoot to Action state
  const [shootAction, setShootAction] = useState('click');
  const [shootValue, setShootValue] = useState('');
  const [showActionDropdown, setShowActionDropdown] = useState(false);

  const runningInstances = instances.filter(i => i.status === 'ready' || i.status === 'idle');

  const executeHumanSimulation = async (type) => {
    if (!selector.trim()) {
      setResult({ success: false, error: 'กรุณาใส่ Selector' });
      return;
    }
    if (!selectedInstance) {
      setResult({ success: false, error: 'กรุณาเลือก Instance' });
      return;
    }

    setLoading(true);
    setResult(null);
    setElementInfo(null);

    try {
      const response = await window.electronAPI.playwright.debugSelector({
        instanceId: selectedInstance.id,
        selector: selector.trim(),
        action: type,
        text: inputText
      });

      setResult({
        success: response.success,
        action: type,
        error: response.error || null
      });

      if (response.elementInfo) {
        setElementInfo(response.elementInfo);
      }
    } catch (error) {
      setResult({
        success: false,
        error: error.message
      });
    }

    setLoading(false);
  };

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

      {/* Instance Selector */}
      <div>
        <label className="block text-white/70 text-sm mb-2">Instance</label>
        <select
          value={selectedInstance?.id || ''}
          onChange={(e) => {
            const inst = runningInstances.find(i => i.id === e.target.value);
            setSelectedInstance(inst || null);
          }}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
        >
          <option value="">-- เลือก Instance --</option>
          {runningInstances.map(inst => (
            <option key={inst.id} value={inst.id}>
              {inst.name || inst.id} ({inst.projectName})
            </option>
          ))}
        </select>
        {runningInstances.length === 0 && (
          <p className="text-yellow-400/70 text-xs mt-1">⚠️ ไม่มี Instance ที่พร้อมใช้งาน</p>
        )}
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

      {/* Input Text (Optional) */}
      <div>
        <label className="block text-white/70 text-sm mb-2">Input Text (Optional)</label>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="ข้อความที่ต้องการพิมพ์..."
          rows={2}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 resize-none"
        />
      </div>

      {/* Human Simulation Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => executeHumanSimulation('hover')}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-blue-300 font-medium transition disabled:opacity-50"
        >
          <MousePointer className="w-4 h-4" />
          Hover
        </button>
        <button
          onClick={() => executeHumanSimulation('click')}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-lg text-green-300 font-medium transition disabled:opacity-50"
        >
          <MousePointer className="w-4 h-4" />
          Click
        </button>
        <button
          onClick={() => executeHumanSimulation('type')}
          disabled={loading || !inputText.trim()}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg text-purple-300 font-medium transition disabled:opacity-50"
        >
          <Type className="w-4 h-4" />
          Type
        </button>
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
              {result.message || (result.success 
                ? `Human ${result.action} สำเร็จ!` 
                : result.error)}
            </span>
          </div>
          {elementInfo && (
            <div className="mt-2 text-xs text-white/60 font-mono">
              Element: &lt;{elementInfo.tagName} {elementInfo.id && `id="${elementInfo.id}"`} {elementInfo.className && `class="${elementInfo.className}"`}&gt;
            </div>
          )}
        </div>
      )}

      {/* Shoot to Action Section */}
      <div className="border-t border-white/10 pt-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-orange-400" />
          <h3 className="text-white font-semibold">Shoot to Recorder</h3>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Action Dropdown */}
          <div className="relative">
            <label className="block text-white/70 text-xs mb-1">Action</label>
            <button
              onClick={() => setShowActionDropdown(!showActionDropdown)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm text-left flex items-center justify-between"
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

          {/* Value Input */}
          <div>
            <label className="block text-white/70 text-xs mb-1">Value (Optional)</label>
            <input
              type="text"
              value={shootValue}
              onChange={(e) => setShootValue(e.target.value)}
              placeholder="ค่าสำหรับ action"
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-white/30"
            />
          </div>
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
