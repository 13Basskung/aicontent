import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Trash2, Download, Filter, RefreshCw, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { fetchExecutionLogs, clearExecutionLogs } from '../lib/firebase';

function ExecutionLogTable({ userId, onRefresh }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [clearing, setClearing] = useState(false);
  const [expandedLog, setExpandedLog] = useState(null); // สำหรับแสดง error details

  // Fetch logs on mount and when filter changes
  useEffect(() => {
    if (userId) {
      loadLogs();
    }
  }, [userId, filter]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await fetchExecutionLogs(userId, filter);
      setLogs(data);
    } catch (error) {
      console.error('Failed to load logs:', error);
    }
    setLoading(false);
  };

  const handleClear = async () => {
    if (!confirm('ต้องการลบ Log ทั้งหมดหรือไม่?')) return;
    
    setClearing(true);
    try {
      await clearExecutionLogs(userId);
      setLogs([]);
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
    setClearing(false);
  };

  const handleExportCSV = () => {
    if (logs.length === 0) return;
    
    const headers = ['Status', 'Project', 'Block', 'Instance', 'Time', 'Duration', 'Step', 'Error'];
    const rows = logs.map(log => [
      log.status === 'success' ? 'Success' : 'Failed',
      log.projectName || '-',
      log.blockName || '-',
      log.instanceName || '-',
      formatTime(log.createdAt),
      formatDuration(log.duration),
      log.failedStep ? `Step ${log.failedStep}/${log.totalSteps}` : `${log.totalSteps} steps`,
      log.error || '-'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `execution-logs-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatTime = (date) => {
    if (!date) return '-';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleString('th-TH', { 
      day: '2-digit', 
      month: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDuration = (ms) => {
    if (!ms || ms === 0) return '-';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  const filterButtons = [
    { value: 'today', label: 'วันนี้' },
    { value: 'week', label: 'สัปดาห์' },
    { value: 'month', label: 'เดือน' },
    { value: 'all', label: 'ทั้งหมด' }
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Execution Log
          <span className="text-white/50 text-sm">({logs.length})</span>
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={loadLogs}
            disabled={loading}
            className="p-1.5 rounded bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExportCSV}
            disabled={logs.length === 0}
            className="p-1.5 rounded bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition disabled:opacity-50"
            title="Export CSV"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={handleClear}
            disabled={clearing || logs.length === 0}
            className="p-1.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 transition disabled:opacity-50"
            title="Clear All"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-1 mb-3">
        {filterButtons.map(btn => (
          <button
            key={btn.value}
            onClick={() => setFilter(btn.value)}
            className={`px-3 py-1 rounded text-sm transition ${
              filter === btn.value
                ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Table Container with Horizontal Scroll */}
      <div className="flex-1 overflow-auto rounded-lg border border-white/10 bg-white/5">
        <div className="min-w-[700px]">
          {/* Table Header */}
          <div className="grid grid-cols-[60px_1fr_1fr_100px_90px_80px_100px_1fr] gap-2 px-3 py-2 bg-white/10 border-b border-white/10 text-xs font-medium text-white/70 sticky top-0">
            <div>Status</div>
            <div>Project</div>
            <div>Block</div>
            <div>Instance</div>
            <div>Time</div>
            <div>Duration</div>
            <div>Step</div>
            <div>Error</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-white/5">
            {loading ? (
              <div className="px-3 py-8 text-center text-white/50">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                Loading...
              </div>
            ) : logs.length === 0 ? (
              <div className="px-3 py-8 text-center text-white/50">
                ไม่มี Log
              </div>
            ) : (
              logs.map((log, index) => (
                <div key={log.id || index}>
                  {/* Main Row */}
                  <div
                    onClick={() => log.status === 'failed' && setExpandedLog(expandedLog === log.id ? null : log.id)}
                    className={`grid grid-cols-[60px_1fr_1fr_100px_90px_80px_100px_1fr] gap-2 px-3 py-2 text-sm hover:bg-white/5 transition cursor-pointer ${
                      log.status === 'failed' ? 'bg-red-500/5' : ''
                    }`}
                  >
                    {/* Status */}
                    <div className="flex items-center gap-1">
                      {log.status === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-red-400" />
                          {expandedLog === log.id ? (
                            <ChevronUp className="w-3 h-3 text-white/50" />
                          ) : (
                            <ChevronDown className="w-3 h-3 text-white/50" />
                          )}
                        </>
                      )}
                    </div>
                    
                    {/* Project */}
                    <div className="text-white/90 truncate" title={log.projectName}>
                      {log.projectName || '-'}
                    </div>
                    
                    {/* Block */}
                    <div className="text-white/90 truncate" title={log.blockName}>
                      {log.blockName || '-'}
                    </div>
                    
                    {/* Instance */}
                    <div className="text-white/70 truncate" title={log.instanceName}>
                      {log.instanceName || '-'}
                    </div>
                    
                    {/* Time */}
                    <div className="text-white/60 text-xs">
                      {formatTime(log.createdAt)}
                    </div>
                    
                    {/* Duration */}
                    <div className="text-white/60">
                      {formatDuration(log.duration)}
                    </div>
                    
                    {/* Step */}
                    <div className={`${log.failedStep ? 'text-red-400' : 'text-white/60'}`}>
                      {log.failedStep 
                        ? `Step ${log.failedStep}/${log.totalSteps}`
                        : `${log.totalSteps} steps`
                      }
                    </div>
                    
                    {/* Error */}
                    <div 
                      className="text-red-400/80 text-xs truncate" 
                      title={log.error || ''}
                    >
                      {log.error || '-'}
                    </div>
                  </div>
                  
                  {/* Error Details (Expanded) */}
                  {expandedLog === log.id && log.status === 'failed' && (
                    <div className="px-3 py-3 bg-red-500/10 border-t border-red-500/20">
                      <div className="text-xs space-y-2">
                        <div className="flex items-center gap-2 text-red-400 font-medium">
                          <AlertTriangle className="w-4 h-4" />
                          รายละเอียดข้อผิดพลาด
                        </div>
                        
                        {/* Failed Action */}
                        {log.failedAction && (
                          <div className="flex gap-2">
                            <span className="text-white/50 w-24">Action:</span>
                            <span className="text-red-300 font-mono">{log.failedAction}</span>
                          </div>
                        )}
                        
                        {/* Failed Selector */}
                        {log.failedSelector && (
                          <div className="flex gap-2">
                            <span className="text-white/50 w-24">Selector:</span>
                            <span className="text-red-300 font-mono text-xs break-all">{log.failedSelector}</span>
                          </div>
                        )}
                        
                        {/* Loop Iteration */}
                        {log.loopIteration && (
                          <div className="flex gap-2">
                            <span className="text-white/50 w-24">Loop รอบที่:</span>
                            <span className="text-yellow-300">{log.loopIteration}</span>
                          </div>
                        )}
                        
                        {/* Scene Validation */}
                        {log.sceneValidation && (
                          <div className="flex gap-2">
                            <span className="text-white/50 w-24">Scene Check:</span>
                            <span className={log.sceneValidation.success ? 'text-green-300' : 'text-red-300'}>
                              {log.sceneValidation.before} → {log.sceneValidation.after}
                              {log.sceneValidation.success ? ' ✓' : ' ✗ (ไม่เพิ่ม)'}
                            </span>
                          </div>
                        )}
                        
                        {/* Failed Steps List */}
                        {log.failedSteps && log.failedSteps.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-red-500/20">
                            <div className="text-white/50 mb-1">Steps ที่ผิดพลาด:</div>
                            <div className="space-y-1 pl-2">
                              {log.failedSteps.map((fs, i) => (
                                <div key={i} className="flex gap-2 text-red-300">
                                  <span className="text-white/40">Step {fs.step}:</span>
                                  <span className="font-mono">{fs.action}</span>
                                  {fs.loopIteration && <span className="text-yellow-400">(Loop {fs.loopIteration})</span>}
                                  <span className="text-red-400/70">- {fs.error}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Full Error Message */}
                        {log.error && (
                          <div className="mt-2 pt-2 border-t border-red-500/20">
                            <div className="text-white/50 mb-1">Error Message:</div>
                            <div className="text-red-300/80 font-mono text-xs break-all bg-black/20 p-2 rounded">
                              {log.error}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExecutionLogTable;
