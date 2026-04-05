import { Eye, MessageCircle, Phone as PhoneIcon, Zap } from "lucide-react";
import type { Prospect } from "@/hooks/useProspectSearch";

export type PreviewBusiness = Pick<
  Prospect,
  "id" | "business_name" | "owner_name" | "owner_email" | "website_url" | "website_screenshot" | "niche"
>;

interface PreviewProps {
  prospect: PreviewBusiness;
  subject: string;
  customMessage: string;
  demoUrl: string;
}

const getHostname = (websiteUrl?: string | null, fallback = "yourwebsite.com") => {
  if (!websiteUrl) return fallback;

  try {
    const normalized = websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`;
    return new URL(normalized).host.replace(/^www\./, "");
  } catch {
    return websiteUrl.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || fallback;
  }
};

const getRecipientLabel = (prospect: PreviewBusiness) => {
  if (prospect.owner_email) return prospect.owner_email;

  const hostname = getHostname(prospect.website_url);
  return hostname.includes(".") ? `hello@${hostname}` : "hello@yourbusiness.com";
};

const getContactName = (prospect: PreviewBusiness) => prospect.owner_name?.trim() || prospect.business_name;

export const buildDemoUrl = (
  prospect: PreviewBusiness,
  baseUrl = typeof window !== "undefined" ? window.location.origin : "",
) => {
  return `${baseUrl}/demo?url=${encodeURIComponent(prospect.website_url || "")}&name=${encodeURIComponent(
    prospect.business_name,
  )}&niche=${encodeURIComponent(prospect.niche || "")}&prospectId=${encodeURIComponent(prospect.id || "")}`;
};

const ScreenshotFallback = ({
  businessName,
  className = "h-[260px]",
}: {
  businessName: string;
  className?: string;
}) => (
  <div className={`flex w-full ${className} flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6 text-center`}>
    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100">
      <Zap className="h-6 w-6 text-emerald-600" />
    </div>
    <p className="text-lg font-semibold text-slate-700">{businessName}</p>
    <p className="mt-1 text-xs text-slate-400">Website image appears here when a saved site screenshot is available</p>
  </div>
);

export const BrowserMockupPreview = ({ prospect, subject, customMessage, demoUrl }: PreviewProps) => {
  const hostname = getHostname(prospect.website_url, prospect.business_name);
  const contactName = getContactName(prospect);

  return (
    <div className="max-h-[560px] space-y-4 overflow-y-auto rounded-xl bg-white p-5 text-sm text-gray-800">
      <div>
        <p className="text-base font-bold text-gray-900">{subject}</p>
        <p className="text-xs text-gray-500">To: {getRecipientLabel(prospect)}</p>
      </div>
      <hr className="border-gray-200" />

      <div className="space-y-3">
        <p className="text-gray-700">Hi {contactName},</p>
        <p className="text-gray-600">
          I came across <strong>{prospect.business_name}</strong> and mocked up something using your own website — a live <strong>Chat AI</strong> and <strong>Voice AI</strong> layer that can answer questions, book appointments, and qualify callers 24/7.
        </p>
        {customMessage && <p className="text-xs italic text-gray-500">{customMessage}</p>}
        <p className="text-gray-600">This is how it could look directly on your site:</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 shadow-lg">
        <div className="flex items-center gap-2 bg-gray-100 px-3 py-2">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-400" />
            <div className="h-3 w-3 rounded-full bg-yellow-400" />
            <div className="h-3 w-3 rounded-full bg-green-400" />
          </div>
          <div className="ml-2 max-w-[220px] flex-1 truncate rounded-md border border-gray-200 bg-white px-3 py-0.5 text-[10px] text-gray-500">
            {hostname}
          </div>
        </div>

        <div className="relative bg-white">
          {prospect.website_screenshot ? (
            <img
              src={prospect.website_screenshot}
              alt={`${prospect.business_name} website`}
              className="h-[260px] w-full object-cover object-top"
            />
          ) : (
            <ScreenshotFallback businessName={prospect.business_name} />
          )}

          <div className="absolute bottom-3 left-3">
            <a
              href={demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-3 py-2 text-[11px] font-semibold text-white shadow-lg transition-colors hover:bg-gray-800"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Chat AI
            </a>
          </div>

          <div className="absolute bottom-3 right-3">
            <a
              href={demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-[11px] font-semibold text-white shadow-lg transition-colors hover:bg-emerald-700"
            >
              <PhoneIcon className="h-3.5 w-3.5" />
              Voice AI
            </a>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
        <p className="mb-2 text-sm font-semibold text-gray-900">Why this matters for {prospect.business_name}:</p>
        <div className="space-y-2 text-sm text-gray-700">
          <p><span className="font-semibold text-emerald-700">•</span> Never miss calls, chats, or after-hours leads again.</p>
          <p><span className="font-semibold text-emerald-700">•</span> Let customers book, reschedule, or confirm appointments automatically.</p>
          <p><span className="font-semibold text-emerald-700">•</span> Answer pricing, service, and FAQ questions instantly.</p>
          <p><span className="font-semibold text-emerald-700">•</span> Warm transfer qualified callers to a real person when needed.</p>
        </div>
      </div>

      <p className="text-gray-600">
        Click below to see the live version — you can actually chat with it or start a voice conversation about your own business in under 30 seconds.
      </p>

      <div className="text-center">
        <a
          href={demoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
        >
          See Your Live AI Demo →
        </a>
      </div>

      <p className="text-center text-[10px] text-gray-400">Simple monthly plans are available once you are ready.</p>
    </div>
  );
};

export const PhoneMockupPreview = ({ prospect, subject, customMessage, demoUrl }: PreviewProps) => {
  const contactName = getContactName(prospect);

  return (
    <div className="max-h-[560px] space-y-4 overflow-y-auto rounded-xl bg-white p-5 text-sm text-gray-800">
      <div>
        <p className="text-base font-bold text-gray-900">{subject}</p>
        <p className="text-xs text-gray-500">To: {getRecipientLabel(prospect)}</p>
      </div>
      <hr className="border-gray-200" />

      <div className="space-y-3 text-center">
        <p className="text-gray-700">Hi {contactName},</p>
        <h3 className="text-xl font-bold text-gray-900">
          Your <span className="text-emerald-600">AI Receptionist</span>, on your site
        </h3>
        <p className="text-gray-600">
          We turned your website into a mobile-friendly demo with Chat AI and Voice AI layered directly on top.
        </p>
        {customMessage && <p className="text-xs italic text-gray-500">{customMessage}</p>}
      </div>

      <div className="flex justify-center py-2">
        <div className="w-[220px]">
          <div className="overflow-hidden rounded-[2.5rem] border-[6px] border-gray-900 bg-black shadow-2xl">
            <div className="flex h-7 items-center justify-center bg-black">
              <div className="h-[18px] w-[60px] rounded-full bg-gray-900" />
            </div>

            <div className="relative bg-white">
              {prospect.website_screenshot ? (
                <img
                  src={prospect.website_screenshot}
                  alt={`${prospect.business_name} website`}
                  className="h-[280px] w-full object-cover object-top"
                />
              ) : (
                <ScreenshotFallback businessName={prospect.business_name} className="h-[280px]" />
              )}

              <div className="absolute bottom-3 left-2.5">
                <a
                  href={demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full bg-gray-900 px-2.5 py-1.5 text-[9px] font-semibold text-white shadow-lg"
                >
                  <MessageCircle className="h-3 w-3" />
                  Chat AI
                </a>
              </div>

              <div className="absolute bottom-3 right-2.5">
                <a
                  href={demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1.5 text-[9px] font-semibold text-white shadow-lg"
                >
                  <PhoneIcon className="h-3 w-3" />
                  Voice AI
                </a>
              </div>
            </div>

            <div className="flex h-5 items-center justify-center bg-black">
              <div className="h-[4px] w-[100px] rounded-full bg-gray-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-gray-700">
        <p className="mb-2 font-semibold text-gray-900">What your AI can handle:</p>
        <p className="mb-1">• Answer incoming questions instantly</p>
        <p className="mb-1">• Book or update appointments without staff time</p>
        <p>• Transfer hot leads to your team after qualifying them first</p>
      </div>

      <div className="text-center">
        <a
          href={demoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
        >
          Try Your Live Demo →
        </a>
      </div>
    </div>
  );
};

export const CleanCardPreview = ({ prospect, subject, customMessage, demoUrl }: PreviewProps) => (
  <div className="max-h-[560px] space-y-4 overflow-y-auto rounded-xl bg-white p-5 text-sm text-gray-800">
    <div>
      <p className="text-base font-bold text-gray-900">{subject}</p>
      <p className="text-xs text-gray-500">To: {getRecipientLabel(prospect)}</p>
    </div>
    <hr className="border-gray-200" />

    <div className="space-y-3">
      <p className="text-gray-700">Hi {getContactName(prospect)},</p>
      {customMessage && <p className="text-gray-600">{customMessage}</p>}
      <p className="text-gray-600">
        We built a quick, personalized AI demo specifically for your business. It shows how an AI receptionist could handle your calls 24/7, book appointments, and never miss a lead.
      </p>
    </div>

    <div className="overflow-hidden rounded-xl border-2 border-emerald-200 bg-emerald-50">
      {prospect.website_screenshot ? (
        <img
          src={prospect.website_screenshot}
          alt={`${prospect.business_name} website`}
          className="h-[140px] w-full object-cover object-top"
        />
      ) : (
        <ScreenshotFallback businessName={prospect.business_name} className="h-[140px]" />
      )}

      <div className="space-y-3 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900">{prospect.business_name}</p>
            <p className="text-xs text-gray-500">Personalized AI Demo Ready</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-emerald-100 bg-white p-2 text-center">
            <p className="text-sm font-bold text-gray-900">24/7</p>
            <p className="text-[9px] text-gray-500">Coverage</p>
          </div>
          <div className="rounded-lg border border-emerald-100 bg-white p-2 text-center">
            <p className="text-sm font-bold text-gray-900">Chat + Voice</p>
            <p className="text-[9px] text-gray-500">AI Agents</p>
          </div>
          <div className="rounded-lg border border-emerald-100 bg-white p-2 text-center">
            <p className="text-sm font-bold text-gray-900">Live</p>
            <p className="text-[9px] text-gray-500">Demo</p>
          </div>
        </div>

        <div className="text-center">
          <a
            href={demoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            Watch Your Demo →
          </a>
        </div>
      </div>
    </div>

    <div className="flex items-center gap-2 text-[10px] text-gray-400">
      <Eye className="h-3 w-3" />
      <span>We will know when this demo is viewed so follow-up can happen at the right time.</span>
    </div>
  </div>
);
