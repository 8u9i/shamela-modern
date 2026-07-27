import { useState } from 'react';
import { Dialog } from '@base-ui/react/dialog';

const tips = [
  {
    title: 'تصفح الكتب',
    text: 'اختر تصنيفاً من القائمة الجانبية لعرض الكتب المتوفرة فيه. يمكنك أيضاً البحث عن كتاب باستخدام شريط البحث في الأعلى.',
  },
  {
    title: 'القراءة والبحث',
    text: 'أثناء قراءة كتاب، استخدم Ctrl+F للبحث في الصفحة الحالية، أو "بحث عام" للبحث في الكتاب كاملاً. يمكنك تغيير حجم الخط وحفظ العلامات المرجعية.',
  },
  {
    title: 'الملاحظات',
    text: 'حدد أي نص أثناء القراءة لتظهر لك أيقونة "حفظ كملاحظة". يمكنك مراجعة ملاحظاتك من التبويب المخصص في القائمة الجانبية.',
  },
  {
    title: 'التصدير والطباعة',
    text: 'يمكنك تصدير محتوى الكتاب إلى ملف نصي، وطباعة المحتوى المعروض. PDF متوفر للكتب التي تحتوي على رابط PDF.',
  },
];

interface TipsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function TipsDialog({ open, onClose }: TipsDialogProps) {
  const [currentTip, setCurrentTip] = useState(0);

  const handleNext = () => {
    if (currentTip < tips.length - 1) {
      setCurrentTip(currentTip + 1);
    } else {
      localStorage.setItem('hasSeenTips', 'true');
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentTip > 0) {
      setCurrentTip(currentTip - 1);
    }
  };

  const handleClose = () => {
    localStorage.setItem('hasSeenTips', 'true');
    setCurrentTip(0);
    onClose();
  };

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl shadow-2xl w-80 max-w-[90vw] p-6">
          <Dialog.Title className="font-arabic text-base text-[var(--accent)] font-bold mb-1">
            {tips[currentTip].title}
          </Dialog.Title>
          <Dialog.Description className="text-sm text-[var(--text-secondary)] leading-relaxed mt-3 mb-6">
            {tips[currentTip].text}
          </Dialog.Description>

          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {tips.map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full ${
                    i === currentTip ? 'bg-[var(--accent)]' : 'bg-[var(--bg-border)]'
                  }`}
                />
              ))}
            </div>
            <div className="flex gap-2">
              {currentTip > 0 && (
                <button
                  onClick={handlePrev}
                  className="px-3 py-1.5 rounded-lg bg-[var(--bg-border)] text-[var(--text-secondary)] text-xs hover:text-[var(--text-primary)] transition-colors"
                >
                  السابق
                </button>
              )}
              <button
                onClick={handleNext}
                className="px-3 py-1.5 rounded-lg bg-[var(--accent)] text-[var(--text-primary)] text-xs font-medium hover:bg-[var(--accent-hover)] transition-colors"
              >
                {currentTip < tips.length - 1 ? 'التالي' : 'انهاء'}
              </button>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
