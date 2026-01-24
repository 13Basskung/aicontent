import React, { useState, useCallback, createContext, useContext } from 'react';
import ConfirmModal from '../components/ui/ConfirmModal';

const ConfirmModalContext = createContext(null);

export const ConfirmModalProvider = ({ children }) => {
    const [modalState, setModalState] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'confirm',
        confirmText: 'ตกลง',
        cancelText: 'ยกเลิก',
        showCancel: true,
        onConfirm: null,
        onCancel: null
    });

    const showModal = useCallback((options) => {
        return new Promise((resolve) => {
            setModalState({
                isOpen: true,
                title: options.title || '📢 แจ้งเตือน',
                message: options.message || '',
                type: options.type || 'confirm',
                confirmText: options.confirmText || 'ตกลง',
                cancelText: options.cancelText || 'ยกเลิก',
                showCancel: options.showCancel !== false,
                onConfirm: () => resolve(true),
                onCancel: () => resolve(false)
            });
        });
    }, []);

    const closeModal = useCallback(() => {
        if (modalState.onCancel) modalState.onCancel();
        setModalState(prev => ({ ...prev, isOpen: false }));
    }, [modalState.onCancel]);

    const confirmModal = useCallback(() => {
        if (modalState.onConfirm) modalState.onConfirm();
        setModalState(prev => ({ ...prev, isOpen: false }));
    }, [modalState.onConfirm]);

    const showAlert = useCallback((message, title = '📢 แจ้งเตือน') => {
        return showModal({
            title,
            message,
            type: 'alert',
            showCancel: false,
            confirmText: 'ตกลง'
        });
    }, [showModal]);

    const showConfirm = useCallback((message, title = '🤔 ยืนยัน') => {
        return showModal({
            title,
            message,
            type: 'confirm',
            showCancel: true
        });
    }, [showModal]);

    const showSuccess = useCallback((message, title = '✅ สำเร็จ') => {
        return showModal({
            title,
            message,
            type: 'success',
            showCancel: false,
            confirmText: 'ตกลง'
        });
    }, [showModal]);

    const showError = useCallback((message, title = '❌ เกิดข้อผิดพลาด') => {
        return showModal({
            title,
            message,
            type: 'error',
            showCancel: false,
            confirmText: 'ตกลง'
        });
    }, [showModal]);

    const showWarning = useCallback((message, title = '⚠️ คำเตือน') => {
        return showModal({
            title,
            message,
            type: 'warning',
            showCancel: true
        });
    }, [showModal]);

    return (
        <ConfirmModalContext.Provider value={{ showModal, showAlert, showConfirm, showSuccess, showError, showWarning }}>
            {children}
            <ConfirmModal
                isOpen={modalState.isOpen}
                onClose={closeModal}
                onConfirm={confirmModal}
                title={modalState.title}
                message={modalState.message}
                type={modalState.type}
                confirmText={modalState.confirmText}
                cancelText={modalState.cancelText}
                showCancel={modalState.showCancel}
            />
        </ConfirmModalContext.Provider>
    );
};

export const useConfirmModal = () => {
    const context = useContext(ConfirmModalContext);
    if (!context) {
        throw new Error('useConfirmModal must be used within a ConfirmModalProvider');
    }
    return context;
};

export default useConfirmModal;
