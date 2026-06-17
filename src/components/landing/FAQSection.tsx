import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

type FaqItem = { q: string; a: string };

const FAQSection = () => {
  const { t } = useTranslation();
  const items = (t("faqSection.items", { returnObjects: true }) as FaqItem[]) || [];

  return (
    <section id="faq" className="py-16 sm:py-24 px-4 sm:px-6 bg-secondary/20 border-t border-border">
      <div className="container mx-auto max-w-3xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
            <HelpCircle className="w-3.5 h-3.5" />
            {t("faqSection.badge")}
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-3">
            {t("faqSection.title")}
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg">
            {t("faqSection.subtitle")}
          </p>
        </div>

        <Accordion type="single" collapsible className="space-y-2">
          {items.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="border border-border rounded-lg bg-card px-4"
            >
              <AccordionTrigger className="text-left text-sm sm:text-base font-semibold hover:no-underline py-4">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <p className="text-center text-xs text-muted-foreground mt-8">
          {t("faqSection.footer")}
        </p>
      </div>
    </section>
  );
};

export default FAQSection;
