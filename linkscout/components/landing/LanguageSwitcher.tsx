'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const isFrench = locale === 'fr';

  const handleSwitch = () => {
    const targetLocale = isFrench ? 'en' : 'fr';
    router.push(pathname, { locale: targetLocale });
  };

  return (
    <button
      onClick={handleSwitch}
      className="text-sm font-normal text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors duration-200 min-h-[48px] min-w-[48px] flex items-center justify-center"
      aria-label={isFrench ? 'Switch to English' : 'Passer en Français'}
    >
      {isFrench ? 'EN' : 'FR'}
    </button>
  );
}
