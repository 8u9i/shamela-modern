import { Dialog } from '@base-ui/react/dialog';
import type { DbStats } from '../types';

interface AboutDialogProps {
  open: boolean;
  onClose: () => void;
  stats: DbStats | null;
}

export function AboutDialog({ open, onClose, stats }: AboutDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl shadow-2xl w-80 max-w-[90vw] p-6">
          <div className="text-center mb-4">
            <Dialog.Title className="font-arabic text-lg text-[var(--accent)] font-bold mb-1">
              المكتبة الشاملة
            </Dialog.Title>
            <Dialog.Description className="text-xs text-[var(--text-muted)]">
              تطبيق قراءة الكتب الإسلامية
            </Dialog.Description>
          </div>

          <div className="space-y-2 text-xs text-[var(--text-secondary)] mb-4">
            <div className="flex justify-between">
              <span>الإصدار</span>
              <span className="text-[var(--text-primary)]">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span>التقنية</span>
              <span className="text-[var(--text-primary)]">Electron + React + SQLite</span>
            </div>
            {stats && (
              <>
                <div className="border-t border-[var(--border)] my-2" />
                <div className="flex justify-between">
                  <span>الكتب</span>
                  <span className="text-[var(--accent)]">{stats.books.toLocaleString('ar')}</span>
                </div>
                <div className="flex justify-between">
                  <span>المؤلفون</span>
                  <span className="text-[var(--accent)]">{stats.authors.toLocaleString('ar')}</span>
                </div>
                <div className="flex justify-between">
                  <span>التصنيفات</span>
                  <span className="text-[var(--accent)]">{stats.categories.toLocaleString('ar')}</span>
                </div>
              </>
            )}
          </div>

          <Dialog.Close className="w-full py-2 bg-[var(--accent)] text-[var(--text-primary)] rounded-xl text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors">
            إغلاق
          </Dialog.Close>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
