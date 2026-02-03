import React, { useState, useEffect } from 'react';
import { 
  Search, Check, X, Target, Zap, ChevronDown, ChevronUp, ExternalLink,
  Play, Layers, Settings2, Save, MousePointer, Hand
} from 'lucide-react';

const EMOJI_OPTIONS = [
  '👆', '⌨️', '⏱️', '🔗', '👁️', '🙈', '📋', '🔤', '⏳', '📊', '📝',
  '🎯', '🔥', '⚡', '🚀', '💡', '✨', '🎨', '🔧', '📦', '🎮', '🎬'
];

// LocalStorage key for saved URLs
const SAVED_URLS_KEY = 'debugSelector_savedUrls';

function DebugSelectorPanel({ 
  blocks,
  onShootToStep, 
  onShootToAction, 
  onShootToOption,
  onShootToBlock
}) {
  // Form State
  const [selector, setSelector] = useState('');
  const [value, setValue] = useState('');
  const [actionName, setActionName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🎯');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // URL State - use localStorage initializer like RecorderPanel
  const [testUrl, setTestUrl] = useState('https://');
  const [savedUrls, setSavedUrls] = useState(() => {
    try {
      const saved = localStorage.getItem(SAVED_URLS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [showSavedUrls, setShowSavedUrls] = useState(false);
  
  // Shoot Dropdown State
  const [showShootDropdown, setShowShootDropdown] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [showBlockDropdown, setShowBlockDropdown] = useState(false);
  const [blockType, setBlockType] = useState('vdo'); // 'vdo' or 'platform'
  
  // Test Result
  const [result, setResult] = useState(null);
  const [testing, setTesting] = useState(false);

  // Save URLs to localStorage when changed
  useEffect(() => {
    try {
      localStorage.setItem(SAVED_URLS_KEY, JSON.stringify(savedUrls));
    } catch (e) {
      console.error('Failed to save URLs:', e);
    }
  }, [savedUrls]);

  // Filter blocks by type
  const vdoBlocks = blocks?.filter(b => b.type === 'video') || [];
  const platformBlocks = blocks?.filter(b => b.type === 'platform') || [];

  // Open URL in default browser (Chrome)
  const handleOpenUrl = () => {
    if (!testUrl || testUrl === 'https://') {
      setResult({ success: false, error: 'กรุณาใส่ URL' });
      return;
    }
    // Open URL in default browser using Electron shell
    if (window.electronAPI?.shell?.openExternal) {
      window.electronAPI.shell.openExternal(testUrl);
      setResult({ success: true, message: 'เปิด URL ใน Browser แล้ว' });
    } else {
      // Fallback: open in new tab
      window.open(testUrl, '_blank');
      setResult({ success: true, message: 'เปิด URL ใน Browser แล้ว' });
    }
  };

  // Save current URL
  const handleSaveUrl = () => {
    if (!testUrl || testUrl === 'https://') {
      setResult({ success: false, error: 'กรุณาใส่ URL' });
      return;
    }
    if (savedUrls.includes(testUrl)) {
      setResult({ success: false, error: 'URL นี้บันทึกไว้แล้ว' });
      return;
    }
    const newSavedUrls = [...savedUrls, testUrl];
    setSavedUrls(newSavedUrls);
    localStorage.setItem(SAVED_URLS_KEY, JSON.stringify(newSavedUrls));
    setResult({ success: true, message: 'บันทึก URL สำเร็จ' });
  };

  // Delete saved URL
  const handleDeleteUrl = (urlToDelete) => {
    const newSavedUrls = savedUrls.filter(u => u !== urlToDelete);
    setSavedUrls(newSavedUrls);
    localStorage.setItem(SAVED_URLS_KEY, JSON.stringify(newSavedUrls));
  };

  // Test Selector (Hover or Click) - uses URL to open browser and test
  const handleTest = async (testType) => {
    if (!selector.trim()) {
      setResult({ success: false, error: 'กรุณาใส่ Selector' });
      return;
    }
    if (!testUrl || testUrl === 'https://') {
      setResult({ success: false, error: 'กรุณาใส่ URL' });
      return;
    }

    setTesting(true);
    setResult(null);

    try {
      const response = await window.electronAPI.playwright.debugSelector({
        url: testUrl,
        selector: selector.trim(),
        action: testType,
        text: value
      });

      setResult({
        success: response.success,
        message: response.success 
          ? `${testType === 'hover' ? 'Hover' : 'Human Click'} สำเร็จ! ${response.elementInfo ? `(${response.elementInfo.tagName})` : ''}` 
          : response.error
      });
    } catch (error) {
      setResult({ success: false, error: error.message });
    }

    setTesting(false);
  };

  // Build step object
  const buildStep = () => ({
    action: 'click', // default action, selector determines behavior
    selector: selector.trim(),
    value: value || '',
    label: actionName || selector.trim(),
    emoji: selectedEmoji,
    modifiers: { preActions: [], postActions: [] }
  });

  // Shoot handlers
  const handleShootToStep = () => {
    if (!selector.trim()) {
      setResult({ success: false, error: 'กรุณาใส่ Selector' });
      return;
    }
    if (onShootToStep) {
      onShootToStep(buildStep());
      setResult({ success: true, message: 'Shoot to Step สำเร็จ!' });
    }
    setShowShootDropdown(false);
  };

  const handleShootToAction = () => {
    if (!selector.trim()) {
      setResult({ success: false, error: 'กรุณาใส่ Selector' });
      return;
    }
    if (onShootToAction) {
      onShootToAction(buildStep());
      setResult({ success: true, message: 'Shoot to Action สำเร็จ!' });
    }
    setShowShootDropdown(false);
  };

  const handleShootToOption = () => {
    if (!selector.trim()) {
      setResult({ success: false, error: 'กรุณาใส่ Selector' });
      return;
    }
    if (onShootToOption) {
      onShootToOption(selector.trim());
      setResult({ success: true, message: 'Shoot to Option สำเร็จ!' });
    }
    setShowShootDropdown(false);
  };

  const handleShootToBlock = () => {
    if (!selector.trim()) {
      setResult({ success: false, error: 'กรุณาใส่ Selector' });
      return;
    }
    if (!selectedBlock) {
      setResult({ success: false, error: 'กรุณาเลือก Block' });
      return;
    }
    if (onShootToBlock) {
      onShootToBlock(selectedBlock.id, buildStep());
      setResult({ success: true, message: `Shoot to "${selectedBlock.name}" สำเร็จ!` });
    }
    setShowShootDropdown(false);
  };

  return (
    <div className="glass rounded-xl p-6 space-y-5">
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
        <label className="block text-white/70 text-sm mb-2">Value (Optional)</label>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="ข้อความ, URL, หรือเวลา (ms)"
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
        />
      </div>

      {/* URL Input + OPEN/SAVE Buttons */}
      <div>
        <label className="block text-white/70 text-sm mb-2">Test URL (เปิดใน Chrome เพื่อ Copy Selector)</label>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={testUrl}
              onChange={(e) => setTestUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
            />
            {savedUrls.length > 0 && (
              <button
                onClick={() => setShowSavedUrls(!showSavedUrls)}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-white/60 text-xs"
              >
                📋 {savedUrls.length}
              </button>
            )}
            {showSavedUrls && savedUrls.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-white/20 rounded-lg shadow-xl z-50 max-h-40 overflow-auto">
                {savedUrls.map((url, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 hover:bg-white/10 text-sm">
                    <button
                      onClick={() => { setTestUrl(url); setShowSavedUrls(false); }}
                      className="flex-1 text-left text-white/80 truncate"
                    >
                      {url}
                    </button>
                    <button
                      onClick={() => handleDeleteUrl(url)}
                      className="ml-2 text-red-400 hover:text-red-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={handleOpenUrl}
            className="px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-blue-300 font-medium transition flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            OPEN
          </button>
          <button
            onClick={handleSaveUrl}
            className="px-4 py-3 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-lg text-green-300 font-medium transition flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            SAVE
          </button>
        </div>
      </div>

      {/* Test Buttons: Hover & Human Click */}
      <div className="flex gap-3">
        <button
          onClick={() => handleTest('hover')}
          disabled={testing || !selector.trim() || !testUrl || testUrl === 'https://'}
          className="flex-1 px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-blue-300 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <MousePointer className="w-5 h-5" />
          {testing ? 'กำลังทดสอบ...' : 'Hover'}
        </button>
        <button
          onClick={() => handleTest('click')}
          disabled={testing || !selector.trim() || !testUrl || testUrl === 'https://'}
          className="flex-1 px-4 py-3 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-lg text-green-300 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Hand className="w-5 h-5" />
          {testing ? 'กำลังทดสอบ...' : 'Human Click'}
        </button>
      </div>

      {/* Action Name + Emoji */}
      <div className="grid grid-cols-4 gap-3">
        <div className="col-span-3">
          <label className="block text-white/70 text-sm mb-2">ตั้งชื่อ Action</label>
          <input
            type="text"
            value={actionName}
            onChange={(e) => setActionName(e.target.value)}
            placeholder="เช่น คลิกปุ่ม Submit, รอโหลดเสร็จ"
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50"
          />
        </div>
        <div className="relative">
          <label className="block text-white/70 text-sm mb-2">Emoji</label>
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-2xl flex items-center justify-center hover:bg-white/20 transition"
          >
            {selectedEmoji}
          </button>
          {showEmojiPicker && (
            <div className="absolute bottom-full left-0 mb-1 bg-slate-800 border border-white/20 rounded-lg shadow-xl z-50 p-2 grid grid-cols-6 gap-1 w-48">
              {EMOJI_OPTIONS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => {
                    setSelectedEmoji(emoji);
                    setShowEmojiPicker(false);
                  }}
                  className="w-8 h-8 flex items-center justify-center text-lg hover:bg-white/10 rounded"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
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

      {/* ADD TO ACTION Button with Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowShootDropdown(!showShootDropdown)}
          disabled={!selector.trim()}
          className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 rounded-lg text-white font-bold text-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Zap className="w-5 h-5" />
          ADD TO ACTION
          <ChevronUp className="w-5 h-5" />
        </button>

        {/* Shoot Options Dropdown (opens upward) */}
        {showShootDropdown && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-slate-800 border border-white/20 rounded-lg shadow-xl z-50 overflow-hidden">
            {/* Shoot to Step */}
            <button
              onClick={handleShootToStep}
              className="w-full px-4 py-3 text-left text-white hover:bg-white/10 flex items-center gap-3 border-b border-white/10"
            >
              <Play className="w-5 h-5 text-green-400" />
              <div>
                <div className="font-semibold">Shoot to Step</div>
                <div className="text-xs text-white/50">ไปที่หน้า Recorder เพื่อสร้าง Block ใหม่</div>
              </div>
            </button>

            {/* Shoot to Action */}
            <button
              onClick={handleShootToAction}
              className="w-full px-4 py-3 text-left text-white hover:bg-white/10 flex items-center gap-3 border-b border-white/10"
            >
              <Target className="w-5 h-5 text-blue-400" />
              <div>
                <div className="font-semibold">Shoot to Action</div>
                <div className="text-xs text-white/50">เพิ่มเป็น Action ใหม่ในรายการ</div>
              </div>
            </button>

            {/* Shoot to Option */}
            <button
              onClick={handleShootToOption}
              className="w-full px-4 py-3 text-left text-white hover:bg-white/10 flex items-center gap-3 border-b border-white/10"
            >
              <Settings2 className="w-5 h-5 text-purple-400" />
              <div>
                <div className="font-semibold">Shoot to Option</div>
                <div className="text-xs text-white/50">เพิ่ม Selector ไปยัง Progress Bar Option</div>
              </div>
            </button>

            {/* Shoot to Block Section */}
            <div className="px-4 py-3 border-t border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Layers className="w-5 h-5 text-orange-400" />
                <span className="font-semibold text-white">Shoot to Block</span>
              </div>
              
              {/* Block Type Tabs */}
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => { setBlockType('vdo'); setSelectedBlock(null); }}
                  className={`flex-1 px-3 py-1.5 rounded text-sm font-medium transition ${
                    blockType === 'vdo' 
                      ? 'bg-orange-500/30 text-orange-300 border border-orange-500/50' 
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  VDO Blocks
                </button>
                <button
                  onClick={() => { setBlockType('platform'); setSelectedBlock(null); }}
                  className={`flex-1 px-3 py-1.5 rounded text-sm font-medium transition ${
                    blockType === 'platform' 
                      ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50' 
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  Platform Blocks
                </button>
              </div>

              {/* Block Selector */}
              <div className="relative mb-2">
                <button
                  onClick={() => setShowBlockDropdown(!showBlockDropdown)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm text-left flex items-center justify-between"
                >
                  <span className="truncate">
                    {selectedBlock ? selectedBlock.name : '-- เลือก Block --'}
                  </span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                {showBlockDropdown && (
                  <div className="absolute bottom-full left-0 right-0 mb-1 bg-slate-700 border border-white/20 rounded shadow-xl max-h-32 overflow-auto">
                    {(blockType === 'vdo' ? vdoBlocks : platformBlocks).length === 0 ? (
                      <div className="px-3 py-2 text-white/50 text-sm">ไม่มี Block</div>
                    ) : (
                      (blockType === 'vdo' ? vdoBlocks : platformBlocks).map(block => (
                        <button
                          key={block.id}
                          onClick={() => {
                            setSelectedBlock(block);
                            setShowBlockDropdown(false);
                          }}
                          className="w-full px-3 py-2 text-left text-white/80 hover:bg-white/10 text-sm"
                        >
                          {block.name}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={handleShootToBlock}
                disabled={!selectedBlock}
                className="w-full px-3 py-2 bg-gradient-to-r from-orange-500/50 to-red-500/50 hover:from-orange-500/70 hover:to-red-500/70 rounded text-white text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Shoot to {selectedBlock?.name || 'Block'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DebugSelectorPanel;
