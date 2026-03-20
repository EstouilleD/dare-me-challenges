import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";

const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();

  const toggle = () => {
    const next = i18n.language?.startsWith("fr") ? "en" : "fr";
    i18n.changeLanguage(next);
  };

  const label = i18n.language?.startsWith("fr") ? "English" : "Français";

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-3 px-6 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors text-left w-full"
    >
      <Globe className="h-5 w-5 text-muted-foreground" />
      {label}
    </button>
  );
};

export default LanguageSwitcher;
