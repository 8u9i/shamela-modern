import { useState } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { BookOpen, Search, StickyNote, Printer, Lightbulb } from 'lucide-react';

const tips = [
  {
    title: 'تصفح الكتب',
    text: 'اختر تصنيفاً من القائمة الجانبية لعرض الكتب المتوفرة فيه. يمكنك أيضاً البحث عن كتاب باستخدام شريط البحث في الأعلى.',
    icon: BookOpen,
  },
  {
    title: 'القراءة والبحث',
    text: 'أثناء قراءة كتاب، استخدم Ctrl+F للبحث في الصفحة الحالية، أو "بحث عام" للبحث في الكتاب كاملاً. يمكنك تغيير حجم الخط وحفظ العلامات المرجعية.',
    icon: Search,
  },
  {
    title: 'الملاحظات',
    text: 'حدد أي نص أثناء القراءة لتظهر لك أيقونة "حفظ كملاحظة". يمكنك مراجعة ملاحظاتك من التبويب المخصص في القائمة الجانبية.',
    icon: StickyNote,
  },
  {
    title: 'التصدير والطباعة',
    text: 'يمكنك تصدير محتوى الكتاب إلى ملف نصي، وطباعة المحتوى المعروض. PDF متوفر للكتب التي تحتوي على رابط PDF.',
    icon: Printer,
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

  const CurrentIcon = tips[currentTip].icon;

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/50 z-50 dialog-backdrop" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-popover border border-border rounded-2xl shadow-xl w-80 max-w-[90vw] p-6 dialog-popup">
          <div className="flex items-center gap-3 mb-2">
            <span className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
              <CurrentIcon className="w-5 h-5" />
            </span>
            <Dialog.Title className="font-arabic text-base text-foreground font-bold">
              {tips[currentTip].title}
            </Dialog.Title>
          </div>
          <Dialog.Description className="text-sm text-muted-foreground leading-relaxed mt-3 mb-6">
            {tips[currentTip].text}
          </Dialog.Description>

          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {tips.map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    i === currentTip ? 'bg-primary' : 'bg-border'
                  }`}
                />
              ))}
            </div>
            <div className="flex gap-2">
              {currentTip > 0 && (
                <button
                  onClick={handlePrev}
                  className="px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs hover:text-foreground transition-colors"
                >
                  السابق
                </button>
              )}
              <button
                onClick={handleNext}
                className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
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
