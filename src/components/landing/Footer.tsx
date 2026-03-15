const Footer = () => {
  return (
    <footer className="py-10 border-t border-border">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <span className="text-primary font-bold text-sm">S</span>
            </div>
            <span className="font-semibold text-foreground">SignalAgent</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} SignalAgent. AI-powered customer engagement.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
