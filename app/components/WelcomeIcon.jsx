import Image from "next/image";
import React from "react";

export default function WelcomeIcon() {
  return (
    <div
      className="hidden md:flex md:w-1/2 relative overflow-hidden min-h-screen"
      role="region"
      aria-label="Welcome panel"
      style={{ backgroundColor: "#003df5" }}
    >
      {/* Decorative soft grid */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none opacity-5 animate__animated animate__fadeIn"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(59,130,246,0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(59,130,246,0.08) 1px, transparent 1px)
          `,
          backgroundSize: "56px 56px",
        }}
      />

      {/* Minimal floating nodes */}
      <div
        aria-hidden="true"
        className="absolute top-28 left-16 w-24 h-24 bg-cyan-400/10 rounded-full blur-3xl animate__animated animate__pulse animate__infinite animate__slow"
      />
      <div
        aria-hidden="true"
        className="absolute bottom-36 right-20 w-28 h-28 bg-blue-500/10 rounded-full blur-3xl animate__animated animate__pulse animate__infinite animate__slower"
        style={{ animationDelay: "1s" }}
      />
      <div
        aria-hidden="true"
        className="absolute top-1/2 left-1/4 w-20 h-20 bg-purple-400/10 rounded-full blur-3xl animate__animated animate__pulse animate__infinite animate__slow"
        style={{ animationDelay: "2s" }}
      />

      {/* Center content */}
      <div className="z-10 w-full flex flex-col items-center justify-center px-8 py-24 text-center">
        <div className="relative w-full max-w-xs animate__animated animate__zoomIn">
          {/* Subtle halo behind logo */}
          <div
            aria-hidden="true"
            className="absolute inset-0 rounded-lg bg-gradient-to-tr from-blue-500/20 to-cyan-400/10 blur-[50px] scale-105 animate__animated animate__pulse animate__infinite animate__slower"
          />

          {/* Logo with subtle corner radius */}
          <div>
            <div className="relative w-full aspect-square">
              <Image
                src="/logo3.gif"
                alt="Company logo"
                fill
                sizes="(min-width: 1024px) 400px, (min-width: 768px) 320px, 200px"
                priority
                unoptimized
                className="relative object-contain opacity-95 rounded-[50px] mix-blend-lighten"
              />
            </div>
          </div>
        </div>

        {/* Tagline */}
        <p className="mt-8 text-center text-white/80 text-xl font-medium tracking-wide max-w-md leading-relaxed animate__animated animate__fadeInUp animate__delay-1s">
          Track your assets. Manage your workflow. Optimize results.
        </p>
      </div>
    </div>
  );
}
