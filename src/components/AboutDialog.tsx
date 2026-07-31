import { Dialog } from '@base-ui/react/dialog';
import { Library, X } from 'lucide-react';
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
        <Dialog.Backdrop className="fixed inset-0 bg-black/50 z-50 dialog-backdrop" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-popover border border-border rounded-2xl shadow-xl w-80 max-w-[90vw] p-6 dialog-popup">
          <div className="text-center mb-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                <Library className="w-5 h-5" />
              </span>
            </div>
            <Dialog.Title className="font-arabic text-lg text-foreground font-bold mb-1">
              المكتبة الشاملة
            </Dialog.Title>
            <Dialog.Description className="text-xs text-muted-foreground">
              تطبيق قراءة الكتب الإسلامية
            </Dialog.Description>
          </div>

          <div className="space-y-2 text-xs text-muted-foreground mb-4">
            <div className="flex justify-between">
              <span>الإصدار</span>
              <span className="text-foreground">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span>التقنية</span>
              <span className="text-foreground">Electron + React + SQLite</span>
            </div>
            {stats && (
              <>
                <div className="border-t border-border my-2" />
                <div className="flex justify-between">
                  <span>الكتب</span>
                  <span className="text-primary font-medium">{stats.books.toLocaleString('ar')}</span>
                </div>
                <div className="flex justify-between">
                  <span>المؤلفون</span>
                  <span className="text-primary font-medium">{stats.authors.toLocaleString('ar')}</span>
                </div>
                <div className="flex justify-between">
                  <span>التصنيفات</span>
                  <span className="text-primary font-medium">{stats.categories.toLocaleString('ar')}</span>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-2">
            <Dialog.Close className="flex-1 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
              إغلاق
            </Dialog.Close>
            <Dialog.Close className="px-2.5 py-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" aria-label="إغلاق">
              <X className="w-4 h-4" />
            </Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
