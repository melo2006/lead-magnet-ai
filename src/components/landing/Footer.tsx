import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="py-10 border-t border-border">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-bold text-sm">H</span>
              </div>
              <span className="font-semibold text-foreground">AI Hidden Leads</span>
            </div>
            <div className="flex items-center gap-6">
              <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              By using our services, you consent to receive SMS/text messages from AI Hidden Leads. Message frequency varies. Reply STOP to opt out. Reply HELP for help. Message and data rates may apply. Consent is not a condition of purchase.
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} AI Hidden Leads. AI-powered lead generation & sales automation.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
