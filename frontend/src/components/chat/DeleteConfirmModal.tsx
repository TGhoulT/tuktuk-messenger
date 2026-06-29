import React, { useState } from 'react';
import { createPortal } from 'react-dom';

interface DeleteConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (removeForCompanion?: boolean) => void;
    count: number;
    userName?: string | null;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    count,
    userName,
}) => {
    const [removeForCompanion, setRemoveForCompanion] = useState(false);
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-bg-primary border border-border rounded-lg w-80 p-6 shadow-xl animate-scale-in"
                onClick={e => e.stopPropagation()}
            >
                <h3 className="text-lg font-semibold text-text-primary mb-2">Удалить {count === 1 ? 'сообщение' : `${count} сообщения`}?</h3>
                {userName && count === 1 && (
                    <div className="flex items-center gap-2 mb-4">
                        <input
                            type="checkbox"
                            id="remove-for-companion"
                            checked={removeForCompanion}
                            onChange={e => setRemoveForCompanion(e.target.checked)}
                            className="w-4 h-4 rounded border-border text-accent-lime focus:ring-accent-lime"
                        />
                        <label htmlFor="remove-for-companion" className="text-sm text-text-secondary cursor-pointer">
                            Также удалить для <span className="text-accent-lime">{userName}</span>
                        </label>
                    </div>
                )}
                {!userName && count === 1 && <p className="text-sm text-text-secondary mb-4">Это действие нельзя отменить.</p>}
                {count > 1 && <p className="text-sm text-text-secondary mb-4">Это действие нельзя отменить.</p>}
                <div className="flex justify-end gap-3 mt-2">
                    <button onClick={onClose} className="px-4 py-2 text-sm bg-bg-tertiary text-text-primary rounded hover:bg-bg-secondary transition">Отмена</button>
                    <button onClick={() => onConfirm(removeForCompanion)} className="px-4 py-2 text-sm bg-accent-lime text-black rounded hover:bg-accent-yellow transition">Удалить</button>
                </div>
            </div>
        </div>,
        document.body
    );
};