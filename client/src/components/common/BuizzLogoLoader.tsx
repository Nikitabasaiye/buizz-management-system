"use client";

import { useState } from "react";

type BuizzVideoLoaderProps = {
  label?: string;
  fullScreen?: boolean;
  className?: string;
  showProgress?: boolean;
};

type ButtonLogoLoaderProps = {
  label?: string;
  className?: string;
};

const LOADER_VIDEO_SRC = "/animations/buizz-logo-loading.mp4";

export function BuizzVideoLoader({
  fullScreen = true,
  className = "",
}: BuizzVideoLoaderProps) {
  const [videoError, setVideoError] = useState(false);

  return (
    <div
      className={
        fullScreen
          ? `fixed inset-0 z-[9999] grid min-h-screen place-items-center overflow-hidden bg-white px-4 ${className}`
          : `relative grid min-h-[420px] place-items-center overflow-hidden bg-white px-4 ${className}`
      }
      aria-live="polite"
      aria-busy="true"
    >
      {!videoError ? (
        <video
          src={LOADER_VIDEO_SRC}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onError={() => setVideoError(true)}
          className="h-[340px] w-[340px] max-h-[78vh] max-w-[88vw] object-contain sm:h-[460px] sm:w-[460px] lg:h-[560px] lg:w-[560px]"
        />
      ) : null}
    </div>
  );
}

export function BuizzLogoLoader(props: BuizzVideoLoaderProps) {
  return <BuizzVideoLoader {...props} />;
}

export function PageLogoLoader() {
  return (
    <div className="grid min-h-[65vh] place-items-center bg-white">
      <BuizzVideoLoader fullScreen={false} />
    </div>
  );
}

export function FullPageLogoLoader() {
  return <BuizzVideoLoader fullScreen />;
}

export function ButtonLogoLoader({
  label,
  className = "",
}: ButtonLogoLoaderProps) {
  return (
    <span className={`inline-flex items-center justify-center gap-2 ${className}`}>
      <span className="size-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
      {label ? <span>{label}</span> : null}
    </span>
  );
}

export const FullPageVideoLoader = FullPageLogoLoader;

export default BuizzVideoLoader;