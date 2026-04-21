const DemoWatermark = () => (
  <div
    className="pointer-events-none fixed inset-0 z-30 overflow-hidden select-none"
    aria-hidden="true"
  >
    <div
      className="absolute inset-[-50%] flex flex-wrap items-center justify-center gap-x-32 gap-y-40"
      style={{ transform: "rotate(-30deg)" }}
    >
      {Array.from({ length: 12 }).map((_, i) => (
        <span
          key={i}
          className="whitespace-nowrap text-[6rem] font-extrabold uppercase tracking-[0.25em] sm:text-[8rem]"
          style={{
            color: "hsl(var(--foreground) / 0.045)",
            WebkitTextStroke: "1px hsl(var(--foreground) / 0.04)",
          }}
        >
          DEMO
        </span>
      ))}
    </div>
  </div>
);

export default DemoWatermark;
