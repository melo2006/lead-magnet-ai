import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const LandingNavbar = () => {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  const scrollTo = (id: string) => {
    setOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
    <div aria-hidden className="h-14 sm:h-16" />
    <nav className="fixed top-0 inset-x-0 z-[90] bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 flex items-center justify-between h-14 sm:h-16">
        <Link to="/" className="flex items-center gap-2" onDoubleClick={(e) => { e.preventDefault(); window.location.href = "/dashboard"; }}>
          <img src="/logo.png" alt="AI Hidden Leads" className="w-8 h-8 sm:w-9 sm:h-9" />
          <span className="text-base sm:text-lg font-extrabold tracking-tight text-foreground">
            AI <span className="text-primary">Hidden</span> Leads
          </span>
        </Link>

        <div className="hidden lg:flex items-center gap-6">
          <button onClick={() => scrollTo("services")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {t("nav.services")}
          </button>
          <button onClick={() => scrollTo("how-it-works")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {t("nav.howItWorks")}
          </button>
          <button onClick={() => scrollTo("pricing")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {t("nav.pricing")}
          </button>
          <button onClick={() => scrollTo("testimonials")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {t("nav.testimonials")}
          </button>
          <button onClick={() => scrollTo("faq")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {t("nav.faq", "Help / FAQ")}
          </button>
          <Link
            to="/transcript"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            title="Video transcript"
          >
            <FileText className="h-3.5 w-3.5" />
            Script
          </Link>
          <LanguageSwitcher />
          <Button size="sm" onClick={() => scrollTo("demo-form")}>
            {t("nav.getFreeDemo")}
          </Button>
          <Link to="/marketing" className="text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors ml-2" title="Marketing Hub">
            📣
          </Link>
          <Link to="/dashboard" className="text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors ml-2" title="Admin">
            ⚙
          </Link>
        </div>

        <div className="lg:hidden flex items-center gap-1">
          <LanguageSwitcher />
          <button onClick={() => setOpen(!open)} className="p-2 text-muted-foreground hover:text-foreground">
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-border bg-background/95 backdrop-blur-xl px-4 py-3 space-y-1">
          {[
            { id: "services", label: t("nav.services") },
            { id: "how-it-works", label: t("nav.howItWorks") },
            { id: "pricing", label: t("nav.pricing") },
            { id: "testimonials", label: t("nav.testimonials") },
            { id: "faq", label: t("nav.faq", "Help / FAQ") },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id)}
              className="block w-full text-left px-3 py-3 rounded-lg text-base font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
            >
              {item.label}
            </button>
          ))}
          <Button size="lg" className="w-full mt-2 text-base" onClick={() => scrollTo("demo-form")}>
            {t("nav.getFreeDemo")}
          </Button>
        </div>
      )}
    </nav>
    </>
  );
};

export default LandingNavbar;
