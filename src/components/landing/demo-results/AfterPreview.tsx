import type { DemoLeadData } from "./demoResultsUtils";
import WebsiteShowcase from "./WebsiteShowcase";

interface AfterPreviewProps {
  leadData: DemoLeadData;
}

const AfterPreview = ({ leadData }: AfterPreviewProps) => {
  return (
    <div className="rounded-[1.75rem] border border-primary/20 bg-card p-4 sm:p-5">
      <div className="mb-4 space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          02 · Modern redesign concept
        </div>
        <div>
          <h3 className="text-2xl font-bold text-foreground">A presentable redesign you can actually demo</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Built from the scraped logo, colors, page content, and a live AI booking flow — now presented like a real website instead of placeholder blocks.
          </p>
        </div>
      </div>

      <WebsiteShowcase leadData={leadData} />
    </div>
  );
};

export default AfterPreview;
