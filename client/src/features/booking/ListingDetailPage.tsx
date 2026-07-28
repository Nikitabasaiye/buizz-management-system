"use client";

import {
  CalendarDays,
  Camera,
  Car,
  Compass,
  ExternalLink,
  Gift,
  Heart,
  MapPin,
  Share2,
  Images,
  Maximize2,
  ShieldCheck,
  Ticket,
  Utensils,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { BuizzLogo } from "@/components/brand/BuizzLogo";
import { Footer } from "@/components/common/Footer";
import type { DiscoveryItem } from "@/features/discovery/data";
import type { UnifiedBuizzEvent } from "@/features/integration/eventLifecycle";
import { resolveTicketTheme } from "@/features/tickets";
import { useGetEventGalleryImagesQuery } from "@/store/api/eventGalleryApi";
import { useWishlistStore } from "@/store/wishlist.store";
import { cn } from "@/lib/cn";

const brandGradient =
  "bg-[linear-gradient(135deg,var(--color-brand-primary),var(--color-brand-secondary))] text-white";

type DetailSocialLink = {
  id?: string;
  platform: string;
  url: string;
  visible?: boolean;
};

type DetailMediaAsset = {
  url?: string;
  src?: string;
};

type DetailMediaConfig = {
  bannerImage?: string | DetailMediaAsset;
  galleryImages?: Array<string | DetailMediaAsset>;
  organizerLogo?: string | DetailMediaAsset;
  videoUrl?: string;
  youtubeUrl?: string;
  socialLinks?: DetailSocialLink[];
};

type DetailMediaItem = DiscoveryItem & {
  bannerImage?: string;
  organizerLogo?: string;
  logoUrl?: string;
  galleryImages?: string[];
  gallery?: string[];
  images?: string[];
  photos?: string[];
  media?: string[] | DetailMediaConfig;
  videoUrl?: string;
  youtubeUrl?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  youtubeChannelUrl?: string;
  websiteUrl?: string;
  socialLinks?: DetailSocialLink[];
  duration?: string;
  ageRestriction?: string;
  termsConditions?: string;
  terms_conditions?: string;
};

function getMediaAssetUrl(asset: unknown) {
  if (!asset) return undefined;
  if (typeof asset === "string") return asset;

  if (typeof asset === "object") {
    const value = asset as DetailMediaAsset;
    return value.url || value.src;
  }

  return undefined;
}

function getMediaAssetUrls(assets: unknown) {
  if (!Array.isArray(assets)) return [];

  return assets
    .map(getMediaAssetUrl)
    .filter(Boolean)
    .map(String);
}

function getNestedMedia(item: DiscoveryItem) {
  const media = (item as DetailMediaItem).media;

  if (!media || Array.isArray(media) || typeof media !== "object") {
    return undefined;
  }

  return media as DetailMediaConfig;
}

function getExplicitEventBannerImage(item: DiscoveryItem) {
  const mediaItem = item as DetailMediaItem;
  const nestedMedia = getNestedMedia(item);

  return getMediaAssetUrl(nestedMedia?.bannerImage) || mediaItem.bannerImage;
}

function getEventOrganizerLogo(item: DiscoveryItem) {
  const mediaItem = item as DetailMediaItem;
  const nestedMedia = getNestedMedia(item);

  return (
    getMediaAssetUrl(nestedMedia?.organizerLogo) ||
    mediaItem.organizerLogo ||
    mediaItem.logoUrl ||
    ""
  );
}

function getEventGalleryImages(item: DiscoveryItem) {
  const mediaItem = item as DetailMediaItem;
  const nestedMedia = getNestedMedia(item);
  const bannerImage = getExplicitEventBannerImage(item) || item.image;

  const organizerImages = [
    ...getMediaAssetUrls(nestedMedia?.galleryImages),
    ...(mediaItem.galleryImages ?? []),
    ...(mediaItem.gallery ?? []),
    ...(mediaItem.images ?? []),
    ...(mediaItem.photos ?? []),
    ...(Array.isArray(mediaItem.media) ? mediaItem.media : []),
  ]
    .filter(Boolean)
    .map(String)
    .filter((image) => image !== bannerImage);

  const uniqueOrganizerImages = Array.from(new Set(organizerImages)).slice(0, 12);

  if (uniqueOrganizerImages.length) {
    return uniqueOrganizerImages;
  }

  return [];
}

function getEventVideoUrl(item: DiscoveryItem) {
  const mediaItem = item as DetailMediaItem;
  const nestedMedia = getNestedMedia(item);

  const organizerVideo =
    nestedMedia?.videoUrl ||
    nestedMedia?.youtubeUrl ||
    mediaItem.videoUrl ||
    mediaItem.youtubeUrl ||
    "";

  if (organizerVideo.trim()) {
    return organizerVideo.trim();
  }

  return "";
}

function normalizeSocialPlatform(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function getEventSocialLinks(item: DiscoveryItem) {
  const mediaItem = item as DetailMediaItem;
  const nestedMedia = getNestedMedia(item);

  const organizerLinks: Array<DetailSocialLink | null> = [
    ...(nestedMedia?.socialLinks ?? []),
    ...(mediaItem.socialLinks ?? []),
    mediaItem.instagramUrl
      ? { platform: "instagram", url: mediaItem.instagramUrl, visible: true }
      : null,
    mediaItem.facebookUrl
      ? { platform: "facebook", url: mediaItem.facebookUrl, visible: true }
      : null,
    mediaItem.linkedinUrl
      ? { platform: "linkedin", url: mediaItem.linkedinUrl, visible: true }
      : null,
    mediaItem.twitterUrl
      ? { platform: "x", url: mediaItem.twitterUrl, visible: true }
      : null,
    mediaItem.youtubeChannelUrl
      ? { platform: "youtube", url: mediaItem.youtubeChannelUrl, visible: true }
      : null,
    mediaItem.websiteUrl
      ? { platform: "website", url: mediaItem.websiteUrl, visible: true }
      : null,
  ];

  const seen = new Set<string>();

  const normalizedOrganizerLinks = organizerLinks
    .filter((link): link is DetailSocialLink => Boolean(link))
    .filter((link) => link.visible !== false && Boolean(link.url?.trim()))
    .map((link) => ({
      ...link,
      platform: normalizeSocialPlatform(link.platform || "link"),
      url: link.url.trim(),
    }))
    .filter((link) => {
      const key = `${link.platform}-${link.url}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  if (normalizedOrganizerLinks.length) {
    return normalizedOrganizerLinks;
  }

  return [];
}

function isVideoFileUrl(value: string) {
  const normalized = value.toLowerCase().split("?")[0];

  return (
    normalized.startsWith("blob:") ||
    /\.(mp4|webm|ogg|mov)$/.test(normalized)
  );
}



function getPlatformLabel(platform: string) {
  const labels: Record<string, string> = {
    instagram: "Instagram",
    facebook: "Facebook",
    linkedin: "LinkedIn",
    x: "X / Twitter",
    twitter: "X / Twitter",
    youtube: "YouTube",
    website: "Website",
    link: "Link",
  };

  return (
    labels[platform] ??
    platform.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}

function PremiumMediaShowcase({ item }: { item: DiscoveryItem }) {
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const numericEventId = Number(item.id);
  const canLoadUploadedGallery = Number.isFinite(numericEventId) && numericEventId > 0;
  const { data: uploadedGalleryImages = [] } = useGetEventGalleryImagesQuery(numericEventId, {
    skip: !canLoadUploadedGallery,
  });

  const uploadedImageUrls = uploadedGalleryImages
    .map((image) => image.image_url)
    .filter(Boolean)
    .map(String);
  const galleryImages = Array.from(new Set([...getEventGalleryImages(item), ...uploadedImageUrls]));
  const organizerLogo = getEventOrganizerLogo(item);
  const videoUrl = getEventVideoUrl(item);
  const socialLinks = getEventSocialLinks(item);

  const hasGallery = galleryImages.length > 0;
  const hasLogo = Boolean(organizerLogo.trim());
  const hasVideo = Boolean(videoUrl.trim());
  const hasSocialLinks = socialLinks.length > 0;

  if (!hasGallery && !hasLogo && !hasVideo && !hasSocialLinks) {
    return null;
  }

  return (
    <DetailSection title="Gallery, Videos & Social Media">
      <div className="grid gap-4 sm:gap-5">
        {hasGallery ? (
          <div className="overflow-hidden rounded-[1.35rem] border border-[var(--app-border)] bg-[var(--app-subtle)] p-3 shadow-[0_18px_54px_rgba(15,23,42,0.08)] sm:rounded-[1.75rem] sm:p-4">
            <div className="mb-3 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[var(--color-brand-primary)]">
                  <Images className="size-4" />
                  Event Gallery
                </p>
                <p className="mt-1 text-xs font-semibold text-[var(--app-muted)] sm:text-sm">
                  Photos added by organizer.
                </p>
              </div>

              <p className="w-fit rounded-full bg-[var(--app-elevated)] px-3 py-1.5 text-[11px] font-black text-[var(--color-brand-primary)] sm:text-xs">
                {galleryImages.length} photo{galleryImages.length === 1 ? "" : "s"}
              </p>
            </div>

            <OrganizerGalleryCollage
              images={galleryImages}
              title={item.title}
              onOpen={setActiveImage}
            />
          </div>
        ) : null}

        {(hasVideo || hasLogo || hasSocialLinks) ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)]">
            {hasVideo ? (
              <MediaVideoBlock videoUrl={videoUrl} title={item.title} />
            ) : null}

            {(hasLogo || hasSocialLinks) ? (
              <div className="grid gap-4">
                {hasLogo ? (
                  <MediaLogoCard logoUrl={organizerLogo} title={item.title} />
                ) : null}

                {hasSocialLinks ? (
                  <MediaSocialIcons links={socialLinks} />
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {activeImage ? (
        <div
          className="fixed inset-0 z-[140] grid place-items-center bg-black/84 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          onClick={() => setActiveImage(null)}
        >
          <button
            type="button"
            onClick={() => setActiveImage(null)}
            className="absolute right-4 top-4 grid size-11 place-items-center rounded-full bg-white text-black shadow-2xl transition active:scale-[0.95]"
            aria-label="Close gallery preview"
          >
            <X className="size-5" />
          </button>

          <img
            src={activeImage}
            alt={item.title}
            className="max-h-[86dvh] w-full max-w-6xl rounded-3xl object-contain shadow-[0_30px_120px_rgba(0,0,0,0.55)]"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </DetailSection>
  );
}

function OrganizerGalleryCollage({
  images,
  title,
  onOpen,
}: {
  images: string[];
  title: string;
  onOpen: (image: string) => void;
}) {
  const visibleImages = images.filter(Boolean);
  const featuredImages = visibleImages.slice(0, 4);
  const remainingImages = visibleImages.slice(4);

  if (!featuredImages.length) return null;

  if (featuredImages.length === 1) {
    return (
      <div className="grid gap-3">
        <MediaGalleryTile
          image={featuredImages[0]}
          title={`${title} gallery photo 1`}
          label="Photo 1"
          className="h-[220px] sm:h-[340px] lg:h-[420px]"
          onOpen={onOpen}
          large
        />
      </div>
    );
  }

  if (featuredImages.length === 2) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {featuredImages.map((image, index) => (
          <MediaGalleryTile
            key={`${image}-${index}`}
            image={image}
            title={`${title} gallery photo ${index + 1}`}
            label={`Photo ${index + 1}`}
            className="h-[200px] sm:h-[300px] lg:h-[370px]"
            onOpen={onOpen}
            large={index === 0}
          />
        ))}
      </div>
    );
  }

  if (featuredImages.length === 3) {
    return (
      <div className="grid gap-3">
        <div className="grid gap-3 lg:grid-cols-[1.25fr_0.75fr]">
          <MediaGalleryTile
            image={featuredImages[0]}
            title={`${title} gallery photo 1`}
            label="Photo 1"
            className="h-[220px] sm:h-[340px] lg:h-[440px]"
            onOpen={onOpen}
            large
          />

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {featuredImages.slice(1).map((image, index) => (
              <MediaGalleryTile
                key={`${image}-${index + 1}`}
                image={image}
                title={`${title} gallery photo ${index + 2}`}
                label={`Photo ${index + 2}`}
                className="h-[170px] sm:h-[210px] lg:h-[214px]"
                onOpen={onOpen}
              />
            ))}
          </div>
        </div>

        <GalleryThumbnailGrid images={remainingImages} title={title} onOpen={onOpen} startIndex={5} />
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
        <MediaGalleryTile
          image={featuredImages[0]}
          title={`${title} gallery photo 1`}
          label="Photo 1"
          className="h-[230px] sm:h-[360px] lg:h-[460px]"
          onOpen={onOpen}
          large
        />

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-2">
          <MediaGalleryTile
            image={featuredImages[1]}
            title={`${title} gallery photo 2`}
            label="Photo 2"
            className="h-[155px] sm:h-[190px] lg:h-[224px]"
            onOpen={onOpen}
          />

          <MediaGalleryTile
            image={featuredImages[2]}
            title={`${title} gallery photo 3`}
            label="Photo 3"
            className="h-[155px] sm:h-[190px] lg:h-[224px]"
            onOpen={onOpen}
          />

          <MediaGalleryTile
            image={featuredImages[3]}
            title={`${title} gallery photo 4`}
            label="Photo 4"
            className="h-[155px] sm:col-span-3 sm:h-[210px] lg:col-span-2 lg:h-[224px]"
            onOpen={onOpen}
          />
        </div>
      </div>

      <GalleryThumbnailGrid images={remainingImages} title={title} onOpen={onOpen} startIndex={5} />
    </div>
  );
}

function GalleryThumbnailGrid({
  images,
  title,
  onOpen,
  startIndex,
}: {
  images: string[];
  title: string;
  onOpen: (image: string) => void;
  startIndex: number;
}) {
  if (!images.length) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {images.map((image, index) => (
        <MediaGalleryTile
          key={`${image}-${startIndex + index}`}
          image={image}
          title={`${title} gallery photo ${startIndex + index}`}
          label={`Photo ${startIndex + index}`}
          className="h-[150px] sm:h-[180px]"
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}



function MediaSocialIcons({ links }: { links: DetailSocialLink[] }) {
  const visibleLinks = links
    .filter((link) => link.visible !== false && link.url?.trim())
    .map((link) => ({
      ...link,
      platform: normalizeSocialPlatform(link.platform),
      url: link.url.trim(),
    }));

  if (!visibleLinks.length) return null;

  return (
    <article className="rounded-[1.35rem] border border-[var(--app-border)] bg-[var(--app-subtle)] p-4 shadow-[0_18px_54px_rgba(15,23,42,0.08)] sm:rounded-[1.75rem]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-brand-primary)]">
            Social Media
          </p>
          <p className="mt-1 text-xs font-semibold leading-5 text-[var(--app-muted)] sm:text-sm sm:leading-6">
            Follow organizer updates and event announcements.
          </p>
        </div>

        <span className="shrink-0 rounded-full bg-[var(--app-elevated)] px-3 py-1.5 text-[11px] font-black text-[var(--color-brand-primary)]">
          {visibleLinks.length}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2.5 sm:gap-3">
        {visibleLinks.map((link) => (
          <a
            key={`${link.platform}-${link.url}`}
            href={link.url}
            target="_blank"
            rel="noreferrer"
            title={getPlatformLabel(link.platform)}
            aria-label={getPlatformLabel(link.platform)}
            className="grid size-11 place-items-center rounded-full border border-[var(--app-border)] bg-[var(--app-elevated)] text-[var(--app-foreground)] shadow-sm transition hover:-translate-y-1 hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)] hover:text-white sm:size-12"
          >
            <SocialMediaIcon platform={link.platform} />
          </a>
        ))}
      </div>
    </article>
  );
}

function SocialMediaIcon({ platform }: { platform: string }) {
  const normalized = normalizeSocialPlatform(platform);

  if (normalized === "instagram") {
    return (
      <svg className="size-5" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="4" width="16" height="16" rx="5" />
        <circle cx="12" cy="12" r="3.5" />
        <circle cx="17" cy="7" r="0.8" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  if (normalized === "facebook") {
    return (
      <svg className="size-5" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
        <path d="M14 8h2V5h-2c-2.4 0-4 1.7-4 4.1V11H8v3h2v7h3v-7h2.4l.6-3h-3V9.2c0-.7.4-1.2 1-1.2Z" />
      </svg>
    );
  }

  if (normalized === "linkedin") {
    return (
      <svg className="size-5" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
        <path d="M5 9h4v12H5V9Zm2-6.5A2.3 2.3 0 1 1 7 7a2.3 2.3 0 0 1 0-4.5ZM11 9h3.7v1.7h.1c.5-.9 1.8-1.9 3.6-1.9 3.9 0 4.6 2.5 4.6 5.8V21h-4v-5.7c0-1.4 0-3.1-1.9-3.1s-2.2 1.5-2.2 3V21H11V9Z" />
      </svg>
    );
  }

  if (normalized === "youtube") {
    return (
      <svg className="size-5" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
        <path d="M21 8.2a3 3 0 0 0-2.1-2.1C17 5.5 12 5.5 12 5.5s-5 0-6.9.6A3 3 0 0 0 3 8.2 31 31 0 0 0 2.5 12a31 31 0 0 0 .5 3.8 3 3 0 0 0 2.1 2.1c1.9.6 6.9.6 6.9.6s5 0 6.9-.6a3 3 0 0 0 2.1-2.1c.4-1.4.5-3.8.5-3.8s0-2.4-.5-3.8ZM10 15.3V8.7l5.7 3.3-5.7 3.3Z" />
      </svg>
    );
  }

  if (normalized === "x" || normalized === "twitter") {
    return (
      <svg className="size-5" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        <path d="m5 5 14 14M19 5 5 19" />
      </svg>
    );
  }

  return <ExternalLink className="size-5" />;
}/////////////////////////////////////////////////

function FixedGalleryMosaic({
  bannerImage,
  galleryImages,
  title,
  onOpen,
}: {
  bannerImage?: string;
  galleryImages: string[];
  title: string;
  onOpen: (image: string) => void;
}) {
  const images = [bannerImage, ...galleryImages].filter(Boolean).slice(0, 8) as string[];

  if (!images.length) return null;

  return (
    <>
      {/* Mobile: simple fixed card stack */}
      <div className="grid gap-3 sm:hidden">
        {images.slice(0, 4).map((image, index) => (
          <MediaGalleryTile
            key={`${image}-${index}`}
            image={image}
            title={`${title} gallery photo ${index + 1}`}
            label={index === 0 && bannerImage ? "Banner" : `Photo ${index + 1}`}
            className="aspect-[4/3] min-h-[180px]"
            onOpen={onOpen}
            large={index === 0}
          />
        ))}
      </div>

      {/* Tablet/Desktop: fixed-size mosaic like reference */}
      <div className="hidden sm:grid fixed-gallery-mosaic gap-3">
        {images[0] ? (
          <MediaGalleryTile
            image={images[0]}
            title={`${title} gallery photo 1`}
            label={bannerImage ? "Banner" : "Photo 1"}
            className="gallery-tile gallery-a"
            onOpen={onOpen}
            large
          />
        ) : null}

        {images[1] ? (
          <MediaGalleryTile
            image={images[1]}
            title={`${title} gallery photo 2`}
            label="Photo 2"
            className="gallery-tile gallery-b"
            onOpen={onOpen}
          />
        ) : null}

        {images[2] ? (
          <MediaGalleryTile
            image={images[2]}
            title={`${title} gallery photo 3`}
            label="Photo 3"
            className="gallery-tile gallery-c"
            onOpen={onOpen}
          />
        ) : null}

        {images[3] ? (
          <MediaGalleryTile
            image={images[3]}
            title={`${title} gallery photo 4`}
            label="Photo 4"
            className="gallery-tile gallery-d"
            onOpen={onOpen}
          />
        ) : null}

        {images[4] ? (
          <MediaGalleryTile
            image={images[4]}
            title={`${title} gallery photo 5`}
            label="Photo 5"
            className="gallery-tile gallery-e"
            onOpen={onOpen}
          />
        ) : null}

        {images[5] ? (
          <MediaGalleryTile
            image={images[5]}
            title={`${title} gallery photo 6`}
            label="Photo 6"
            className="gallery-tile gallery-f"
            onOpen={onOpen}
          />
        ) : null}

        {images[6] ? (
          <MediaGalleryTile
            image={images[6]}
            title={`${title} gallery photo 7`}
            label="Photo 7"
            className="gallery-tile gallery-g"
            onOpen={onOpen}
          />
        ) : null}

        {images[7] ? (
          <MediaGalleryTile
            image={images[7]}
            title={`${title} gallery photo 8`}
            label="Photo 8"
            className="gallery-tile gallery-h"
            onOpen={onOpen}
          />
        ) : null}
      </div>

      <style jsx>{`
        .fixed-gallery-mosaic {
          grid-template-columns: 1.2fr 1fr 0.9fr;
          grid-template-rows: repeat(4, 105px);
          grid-template-areas:
            "a b c"
            "a d d"
            "e e f"
            "g h f";
        }

        .gallery-tile {
          min-height: 0;
          height: 100%;
        }

        .gallery-a {
          grid-area: a;
        }
        .gallery-b {
          grid-area: b;
        }
        .gallery-c {
          grid-area: c;
        }
        .gallery-d {
          grid-area: d;
        }
        .gallery-e {
          grid-area: e;
        }
        .gallery-f {
          grid-area: f;
        }
        .gallery-g {
          grid-area: g;
        }
        .gallery-h {
          grid-area: h;
        }

        @media (min-width: 1024px) {
          .fixed-gallery-mosaic {
            grid-template-rows: repeat(4, 135px);
          }
        }
      `}</style>
    </>
  );
}
function MediaGalleryTile({
  image,
  title,
  label,
  className,
  onOpen,
  large = false,
}: {
  image: string;
  title: string;
  label: string;
  className: string;
  onOpen: (image: string) => void;
  large?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(image)}
      className={`group relative isolate overflow-hidden rounded-[1.15rem] bg-[var(--app-elevated)] text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(236,27,114,0.16)] sm:rounded-[1.35rem] ${className}`}
      aria-label={`Open ${title}`}
    >
      <img
        src={image}
        alt={title}
        loading={large ? "eager" : "lazy"}
        className="size-full object-cover transition duration-700 group-hover:scale-110"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/68 via-black/8 to-transparent opacity-90" />

      <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2">
        <span className="rounded-full border border-white/20 bg-white/12 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white backdrop-blur-xl">
          {label}
        </span>

        <span className="grid size-8 place-items-center rounded-full border border-white/18 bg-black/38 text-white backdrop-blur-xl transition group-hover:bg-white group-hover:text-[var(--color-brand-primary)]">
          <Maximize2 className="size-4" />
        </span>
      </div>
    </button>
  );
}

function MediaVideoBlock({
  videoUrl,
  title,
}: {
  videoUrl: string;
  title: string;
}) {
  const youtubeEmbedUrl = getYoutubeEmbedUrl(videoUrl);

  return (
    <article className="overflow-hidden rounded-[1.25rem] border border-[var(--app-border)] bg-[var(--app-subtle)] shadow-[0_14px_38px_rgba(15,23,42,0.07)] sm:rounded-[1.5rem]">
      <div className="border-b border-[var(--app-border)] bg-[var(--app-elevated)] p-3 sm:p-4">
        <p className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--color-brand-primary)] sm:text-xs">
          <Camera className="size-4" />
          Video
        </p>
        <p className="mt-1 text-xs font-semibold text-[var(--app-muted)] sm:text-sm">
          Organizer uploaded video, teaser, trailer, or YouTube link.
        </p>
      </div>

      {youtubeEmbedUrl ? (
        <div className="aspect-video bg-black">
          <iframe
            className="size-full"
            src={youtubeEmbedUrl}
            title={`${title} video`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      ) : isVideoFileUrl(videoUrl) ? (
        <video
          className="aspect-video w-full bg-black object-contain"
          controls
          src={videoUrl}
        />
      ) : (
        <div className="grid min-h-[180px] place-items-center bg-[var(--app-elevated)] p-5 text-center sm:min-h-[220px] sm:p-6">
          <div>
            <Camera className="mx-auto size-8 text-[var(--color-brand-primary)]" />

            <p className="mt-3 text-sm font-black text-[var(--app-foreground)]">
              Video link added
            </p>

            <a
              href={videoUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,var(--color-brand-primary),var(--color-brand-secondary))] px-4 text-xs font-black text-white"
            >
              Open video
              <ExternalLink className="size-3.5" />
            </a>
          </div>
        </div>
      )}
    </article>
  );
}

function MediaLogoCard({
  logoUrl,
  title,
}: {
  logoUrl: string;
  title: string;
}) {
  return (
    <article className="rounded-[1.25rem] border border-[var(--app-border)] bg-[var(--app-subtle)] p-3 shadow-[0_14px_38px_rgba(15,23,42,0.07)] sm:rounded-[1.5rem] sm:p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--color-brand-primary)] sm:text-xs">
        Organizer Logo
      </p>

      <div className="mt-3 flex items-center gap-3">
        <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] sm:size-14">
          <img
            src={logoUrl}
            alt={`${title} organizer logo`}
            className="size-full object-cover"
          />
        </div>

        <p className="min-w-0 text-xs font-semibold leading-5 text-[var(--app-muted)] sm:text-sm sm:leading-6">
          Official organizer branding uploaded for this listing.
        </p>
      </div>
    </article>
  );
}

function MediaSocialLinks({ links }: { links: DetailSocialLink[] }) {
  return (
    <article className="rounded-[1.25rem] border border-[var(--app-border)] bg-[var(--app-subtle)] p-3 shadow-[0_14px_38px_rgba(15,23,42,0.07)] sm:rounded-[1.5rem] sm:p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--color-brand-primary)] sm:text-xs">
        Social Media
      </p>

      <p className="mt-1 text-xs font-semibold leading-5 text-[var(--app-muted)] sm:text-sm sm:leading-6">
        Follow organizer updates, reels, announcements, and community posts.
      </p>

      <div className="mt-3 grid gap-2">
        {links.map((link) => (
          <a
            key={`${link.platform}-${link.url}`}
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-10 items-center justify-between gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 text-xs font-black text-[var(--app-foreground)] transition hover:-translate-y-0.5 hover:border-[var(--color-brand-primary)]/40 hover:text-[var(--color-brand-primary)] sm:min-h-11 sm:px-4 sm:text-sm"
          >
            <span className="min-w-0 truncate">
              {getPlatformLabel(link.platform)}
            </span>
            <ExternalLink className="size-4 shrink-0" />
          </a>
        ))}
      </div>
    </article>
  );
}

function localDetailKind(event: UnifiedBuizzEvent): DiscoveryItem["kind"] {
  const value = `${event.category} ${event.subCategory ?? ""}`.toLowerCase();
  if (value.includes("play") || value.includes("theatre")) return "plays";
  if (value.includes("activit") || value.includes("workshop")) return "activities";
  return "events";
}
const organizerAboutFieldKeys = [
  "aboutEvent",
  "aboutThisEvent",
  "eventAbout",
  "eventOverview",
  "organizerAboutEvent",
  "organizerDescription",
  "publicDescription",
  "shortDescription",
  "description",
] as const;

const organizerAboutNestedKeys = [
  "basicDetails",
  "eventDetails",
  "publicDetails",
  "content",
  "details",
  "organizerData",
] as const;

function getDynamicOrganizerText(source: unknown, keys: readonly string[] = organizerAboutFieldKeys): string {
  if (!source || typeof source !== "object") return "";

  const record = source as Record<string, unknown>;

  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  for (const nestedKey of organizerAboutNestedKeys) {
    const nestedText = getDynamicOrganizerText(record[nestedKey], keys);

    if (nestedText) return nestedText;
  }

  return "";
}

function getOrganizerAboutEventText(item: DiscoveryItem, event: UnifiedBuizzEvent | null) {
  return (
    getDynamicOrganizerText(event) ||
    getDynamicOrganizerText(item) ||
    "Event details will be updated soon."
  );
}

function getPublishedDetailValue(
  item: DiscoveryItem,
  event: UnifiedBuizzEvent | null,
  keys: readonly string[],
) {
  return getDynamicOrganizerText(event, keys) || getDynamicOrganizerText(item, keys);
}

function getPublishedDuration(item: DiscoveryItem, event: UnifiedBuizzEvent | null) {
  return getPublishedDetailValue(item, event, ["duration", "eventDuration", "showDuration", "runtime"]) || "Duration pending";
}

function getPublishedAgeRestriction(item: DiscoveryItem, event: UnifiedBuizzEvent | null) {
  return getPublishedDetailValue(item, event, ["ageRestriction", "age_restriction", "ageLimit", "ageGroup", "minimumAge"]) || "All ages";
}

function parseTermsValue(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.flatMap(parseTermsValue);
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const values = [
      record.refundPolicy,
      record.cancellationPolicy,
      record.entryRules,
      record.customTerms,
      record.terms,
      record.termsConditions,
      record.terms_conditions,
    ];

    return values.flatMap(parseTermsValue);
  }

  if (typeof value !== "string") return [String(value)];

  const trimmed = value.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return parseTermsValue(JSON.parse(trimmed));
    } catch {
      // Use the submitted text below.
    }
  }

  return trimmed
    .split(/\r?\n|•|;/)
    .map((term) => term.trim())
    .filter(Boolean);
}

function getPublishedTerms(item: DiscoveryItem, event: UnifiedBuizzEvent | null) {
  const mediaItem = item as DetailMediaItem;
  const eventRecord = event as Record<string, unknown> | null;

  const submittedTerms = [
    eventRecord?.termsConditions,
    eventRecord?.terms_conditions,
    eventRecord?.policies,
    eventRecord?.policy,
    mediaItem.termsConditions,
    mediaItem.terms_conditions,
  ].flatMap(parseTermsValue);

  const uniqueTerms = Array.from(new Set(submittedTerms));
  if (uniqueTerms.length) return uniqueTerms;

  return [
    "By accepting, holding or using a ticket, you acknowledge the event terms and venue rules.",
    "Age limit and entry rules are controlled by the event organizer and venue.",
    "Entry is permitted only after QR verification at the specified entrance.",
    "Re-entry is not permitted unless the venue explicitly allows it.",
    "Outside food, drinks, hazardous items, and restricted articles are not allowed inside the venue.",
    "Tickets are subject to Buizz refund policy and event-specific cancellation rules.",
  ];
}


const organizerOfferArrayKeys = [
  "offers",
  "deals",
  "discounts",
  "promotions",
  "offerCards",
  "couponOffers",
] as const;

const organizerUpcomingArrayKeys = [
  "upcomingEvents",
  "upcomingListings",
  "moreDates",
  "moreShows",
  "sameEventDates",
  "sameOrganizerEvents",
  "otherOrganizerEvents",
  "relatedListings",
] as const;

const organizerUpcomingDescriptionKeys = [
  "upcomingEventsDescription",
  "upcomingDescription",
  "moreDatesDescription",
  "relatedListingsDescription",
  "organizerUpcomingNote",
] as const;

const organizerIdentityKeys = [
  "organizerId",
  "organizerName",
  "organizer",
  "hostName",
  "createdByName",
  "publisherName",
] as const;

function getDynamicOrganizerArray(source: unknown, keys: readonly string[]): unknown[] {
  if (!source || typeof source !== "object") return [];

  const record = source as Record<string, unknown>;

  for (const key of keys) {
    const value = record[key];

    if (Array.isArray(value) && value.length) return value;
  }

  for (const nestedKey of organizerAboutNestedKeys) {
    const nestedItems = getDynamicOrganizerArray(record[nestedKey], keys);
    if (nestedItems.length) return nestedItems;
  }

  return [];
}

const offerToneClasses = [
  "from-[var(--color-brand-primary)] to-[var(--color-brand-secondary)]",
  "from-[var(--color-brand-secondary)] to-[var(--color-brand-primary)]",
  "from-[var(--color-brand-primary)] to-[var(--color-brand-accent)]",
  "from-[var(--app-card)] to-[var(--color-brand-secondary)]",
];

function normalizeDynamicOfferCard(offer: unknown, index: number) {
  if (!offer || typeof offer !== "object") return null;

  const record = offer as Record<string, unknown>;
  const title = getDynamicOrganizerText(record, ["title", "name", "headline", "offerTitle", "codeLabel"]);
  const detail =
    getDynamicOrganizerText(record, ["detail", "description", "subtitle", "terms", "note", "code", "couponCode"]) ||
    "Offer details will be shown before checkout.";

  if (!title.trim()) return null;

  const tone =
    typeof record.tone === "string" && record.tone.trim()
      ? record.tone.trim()
      : offerToneClasses[index % offerToneClasses.length] || offerToneClasses[0];

  return { title: title.trim(), detail: detail.trim(), tone };
}

function getDynamicOfferCards(event: UnifiedBuizzEvent | null, item: DiscoveryItem) {
  const dynamicOffers = [
    ...getDynamicOrganizerArray(event, organizerOfferArrayKeys),
    ...getDynamicOrganizerArray(item, organizerOfferArrayKeys),
  ]
    .map((offer, index) => normalizeDynamicOfferCard(offer, index))
    .filter((offer): offer is { title: string; detail: string; tone: string } => Boolean(offer));

  if (dynamicOffers.length) return dynamicOffers.slice(0, 4);
  return [];
}

function normalizeIdentity(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function getOrganizerIdentity(source: unknown) {
  return normalizeIdentity(getDynamicOrganizerText(source, organizerIdentityKeys));
}

function getSeriesKey(value: string) {
  return normalizeIdentity(value)
    .replace(/\s+-\s+[a-z ]+$/i, "")
    .replace(/\s+in\s+[a-z ]+$/i, "")
    .replace(/\s+at\s+[a-z ]+$/i, "");
}

function uniqueDiscoveryItems(items: DiscoveryItem[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = `${item.kind}:${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeUpcomingItem(value: unknown): DiscoveryItem | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const maybeUnified = value as UnifiedBuizzEvent;

  if (typeof record.id === "string" && typeof record.title === "string" && typeof record.venueName === "string") {
    return localDetailItem(maybeUnified);
  }

  if (typeof record.id !== "string" || typeof record.title !== "string") return null;

  const kind = ["events", "plays", "activities"].includes(String(record.kind))
    ? (String(record.kind) as DiscoveryItem["kind"])
    : "events";

  const price = Number(record.price ?? record.priceMin ?? 0);
  const city = typeof record.city === "string" ? record.city : "City pending";
  const venue =
    typeof record.venue === "string"
      ? record.venue
      : typeof record.venueName === "string"
        ? record.venueName
        : "Venue pending";

  return {
    id: record.id,
    title: record.title,
    kind,
    category: typeof record.category === "string" ? record.category : "Event",
    genre: typeof record.genre === "string" ? record.genre : typeof record.category === "string" ? record.category : "Event",
    date: typeof record.date === "string" ? record.date : "Date pending",
    dateValue: typeof record.dateValue === "string" ? record.dateValue : typeof record.date === "string" ? record.date : "2026-12-31",
    venue,
    city,
    distanceKm: Number(record.distanceKm ?? 0),
    price,
    priceLabel: price > 0 ? `Rs. ${price.toLocaleString("en-IN")} onwards` : "Free",
    rating: Number(record.rating ?? 4.6),
    popularity: Number(record.popularity ?? 80),
    image:
      typeof record.image === "string"
        ? record.image
        : typeof record.bannerImage === "string"
          ? record.bannerImage
          : "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1000&q=80",
    badge: typeof record.badge === "string" ? record.badge : "Upcoming",
    description:
      getDynamicOrganizerText(record, [
        "description",
        "aboutEvent",
        "aboutThisEvent",
        "eventOverview",
        "shortDescription",
        "summary",
      ]) ||
      `${String(record.title)} is available on Buizz with verified booking, QR ticket delivery, and organizer-managed event details.`,
    tags: Array.isArray(record.tags) ? record.tags.map(String) : [],
    quickFilters: [],
    href: `/${kind}/${record.id}`,
    slot: typeof record.slot === "string" ? record.slot : typeof record.time === "string" ? record.time : undefined,
  } as DiscoveryItem;
}

function getDynamicUpcomingItems(currentItem: DiscoveryItem, currentEvent: UnifiedBuizzEvent | null) {
  const explicitUpcoming = [
    ...getDynamicOrganizerArray(currentEvent, organizerUpcomingArrayKeys),
    ...getDynamicOrganizerArray(currentItem, organizerUpcomingArrayKeys),
  ]
    .map(normalizeUpcomingItem)
    .filter((item): item is DiscoveryItem => Boolean(item));

  return uniqueDiscoveryItems(explicitUpcoming).slice(0, 12);
}

function getUpcomingSectionDescription(event: UnifiedBuizzEvent | null, item: DiscoveryItem) {
  return getDynamicOrganizerText(event, organizerUpcomingDescriptionKeys) || getDynamicOrganizerText(item, organizerUpcomingDescriptionKeys);
}

function getListingRouteKind(kind: unknown): DiscoveryItem["kind"] {
  if (kind === "plays" || kind === "activities" || kind === "events") {
    return kind;
  }

  return "events";
}

function getListingDetailHref(item: DiscoveryItem) {
  return `/${getListingRouteKind(item.kind)}/${item.id}`;
}

function getListingBookingHref(
  item: DiscoveryItem,
  event: UnifiedBuizzEvent | null,
  requestedId?: string,
) {
  const routeKind = getListingRouteKind(item.kind);
  const routeId = event?.id || item.id || requestedId || "";

  return `/${routeKind}/${encodeURIComponent(routeId)}/booking`;
}
function localDetailItem(event: UnifiedBuizzEvent): DiscoveryItem {
  const kind = localDetailKind(event);
  const price = event.priceMin || 0;
  const mediaEvent = event as UnifiedBuizzEvent & Partial<DetailMediaItem>;
  const nestedMedia = getNestedMedia(mediaEvent as DiscoveryItem);
  const bannerImage = getMediaAssetUrl(nestedMedia?.bannerImage) || mediaEvent.bannerImage;
  const organizerLogo = getMediaAssetUrl(nestedMedia?.organizerLogo) || mediaEvent.organizerLogo || mediaEvent.logoUrl || "";
  const galleryImages = Array.from(
    new Set([
      ...getMediaAssetUrls(nestedMedia?.galleryImages),
      ...(mediaEvent.galleryImages ?? []),
      ...(mediaEvent.gallery ?? []),
      ...(mediaEvent.images ?? []),
      ...(mediaEvent.photos ?? []),
      ...(Array.isArray(mediaEvent.media) ? mediaEvent.media : []),
    ].filter(Boolean).map(String)),
  ).slice(0, 12);
  const videoUrl = nestedMedia?.videoUrl || mediaEvent.videoUrl || mediaEvent.youtubeUrl || "";
  const socialLinks = getEventSocialLinks({
    ...mediaEvent,
    media: nestedMedia,
  } as DiscoveryItem);
  const organizerAboutText = getDynamicOrganizerText(event);
  return {
    id: event.id,
    title: event.title,
    kind,
    category: event.subCategory || event.category || "Music Events",
    genre: event.subCategory || event.category || "Event",
    date: event.date || "Date pending",
    dateValue: event.date || "2026-12-31",
    venue: event.venueName,
    city: event.city,
    distanceKm: 1.8,
    price,
    priceLabel: price > 0 ? `Rs. ${price.toLocaleString("en-IN")} onwards` : "Free",
    rating: 4.6,
    popularity: 98,
    image:
      bannerImage ||
      event.bannerImage ||
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1000&q=80",
    bannerImage,
    organizerLogo,
    logoUrl: organizerLogo,
    galleryImages,
    videoUrl,
    youtubeUrl: videoUrl,
    socialLinks,
    description: organizerAboutText || "Event details will be updated soon.",
    badge: "Published",
    tags: Array.from(new Set([event.category, event.subCategory, event.city, "Verified Event"].filter(Boolean).map(String))),
    quickFilters: ["This Weekend", "Near You"],
    href: `/${kind}/${event.id}`,
    slot: event.time ? `${event.date} at ${event.time}` : event.date,
  } as DiscoveryItem;
}

export function ListingDetailPage({ item: initialItem, requestedId }: { item: DiscoveryItem; requestedId?: string }) {
  const savedIds = useWishlistStore((state) => state.savedIds);
  const toggleSaved = useWishlistStore((state) => state.toggleSaved);


  const [termsOpen, setTermsOpen] = useState(false);
  const detailEvent = null as UnifiedBuizzEvent | null;
  const displayItem = initialItem;

  const usesSeatMap =
    detailEvent?.seatMapMode === "seat_map" ||
    detailEvent?.venueSeatMaps?.some((venue) => venue.seatMapMode === "seat_map");

  const saved = savedIds.includes(displayItem.id);
  const bookingLabel = usesSeatMap ? "Select Seats" : displayItem.price <= 0 ? "Register" : displayItem.kind === "activities" ? "Book Now" : "Book Tickets";
  const normalizedPriceLabel = getBookingPriceLabel(displayItem);

  const item = displayItem;
  const bookingHref = getListingBookingHref(item, detailEvent, requestedId);
  const displayTitle = item.title;
  const displayDescription = item.description;
  const displayVenue = item.venue;
  const aboutEventText = getOrganizerAboutEventText(item, detailEvent);
  const publishedDuration = getPublishedDuration(item, detailEvent);
  const publishedAgeRestriction = getPublishedAgeRestriction(item, detailEvent);
  const publishedTerms = getPublishedTerms(item, detailEvent);

  const dynamicOfferCards = useMemo(
    () => getDynamicOfferCards(detailEvent, item),
    [detailEvent, item],
  );

  const upcomingItems = useMemo(
    () => getDynamicUpcomingItems(item, detailEvent),
    [detailEvent, item],
  );

  const upcomingSectionDescription = useMemo(
    () => getUpcomingSectionDescription(detailEvent, item),
    [detailEvent, item],
  );

  const shareListing = async () => {
    const shareUrl = `${window.location.origin}/${item.kind}/${item.id}`;
    const shareText = `${displayTitle} on Buizz - ${item.date} at ${displayVenue}, ${item.city}.`;

    if (navigator.share) {
      await navigator.share({ title: displayTitle, text: shareText, url: shareUrl });
      return;
    }

    await navigator.clipboard?.writeText(`${shareText} ${shareUrl}`);
  };

  return (
    <>
      <main className="buizz-site-shell overflow-x-hidden pb-24 xl:pb-8">
        <section className="pt-3 sm:pt-5">
          <div className="buizz-site-container-wide">
            <div className="group overflow-hidden rounded-[26px] border border-[var(--app-border)] bg-black shadow-[0_22px_70px_rgba(0,0,0,0.22)] sm:rounded-3xl">
              <div className="relative min-h-[455px] overflow-hidden sm:min-h-[500px] lg:min-h-[560px]">
                <img
                  src={item.image}
                  alt={displayTitle}
                  className="absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-105"
                />

                <div className="absolute inset-0 bg-gradient-to-r from-black/92 via-black/72 to-black/18" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/20 to-transparent" />

                <div className="absolute right-3 top-3 z-20 flex gap-2 sm:right-5 sm:top-5">
                  <button
                    type="button"
                    onClick={() => toggleSaved(item.id)}
                    className="grid size-10 place-items-center rounded-xl border border-white/20 bg-black/35 text-white backdrop-blur transition hover:bg-white hover:text-[var(--color-brand-primary)] active:scale-[0.96] sm:size-12 sm:rounded-2xl"
                    aria-label={saved ? "Remove from wishlist" : "Save event"}
                  >
                    <Heart className="size-5" fill={saved ? "currentColor" : "none"} />
                  </button>

                  <button
                    type="button"
                    onClick={shareListing}
                    className="grid size-10 place-items-center rounded-xl border border-white/20 bg-black/35 text-white backdrop-blur transition hover:bg-white hover:text-[var(--color-brand-primary)] active:scale-[0.96] sm:size-12 sm:rounded-2xl"
                    aria-label="Share event"
                  >
                    <Share2 className="size-5" />
                  </button>
                </div>

                <div className="relative z-10 flex min-h-[455px] max-w-[790px] flex-col justify-end p-5 text-white sm:min-h-[500px] sm:p-8 lg:min-h-[560px] lg:p-10">
                  <div className="flex flex-wrap gap-2">
                    <span className="w-fit rounded-lg bg-[var(--color-brand-primary)] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-white sm:text-[10px]">
                      {item.badge || "Live Event"}
                    </span>

                    <span className="w-fit rounded-lg border border-white/15 bg-black/30 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-white/90 backdrop-blur sm:text-[10px]">
                      {item.category}
                    </span>
                  </div>

                  <h1 className="mt-4 max-w-3xl text-[34px] font-black leading-[0.98] tracking-[-0.05em] text-white sm:text-5xl lg:text-6xl">
                    {displayTitle}
                  </h1>

                  <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-bold text-white/85 sm:text-sm">
                    <span>{item.date}</span>
                    <span>|</span>
                    <span>{item.slot ?? "8:00 PM Onwards"}</span>
                    <span>|</span>
                    <span>{item.category}</span>
                  </div>

                  <p className="mt-3 flex items-center gap-2 text-sm font-black text-white/90">
                    <MapPin className="size-4 shrink-0" />
                    <span className="line-clamp-1">
                      {displayVenue}, {item.city}
                    </span>
                  </p>

                  <p className="mt-4 line-clamp-3 max-w-md text-sm font-semibold leading-6 text-white/80 sm:text-base sm:leading-7">
                    {displayDescription}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-black">
                    <span className="rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white/90 backdrop-blur">
                      Verified Entry
                    </span>

                    <span className="rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white/90 backdrop-blur">
                      QR Ticket
                    </span>

                    <span className="rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white/90 backdrop-blur">
                      Secure Booking
                    </span>
                  </div>

                  <p className="mt-4 text-sm font-black text-white sm:text-base">
                    {normalizedPriceLabel}
                  </p>

                  <div className="mt-5 flex w-full max-w-md gap-3">
                    <Link
                      href={bookingHref}
                      className="buizz-button-primary min-h-12 flex-1 rounded-xl px-4 text-sm"
                    >
                      {bookingLabel}
                    </Link>

                    <button
                      type="button"
                      onClick={() => toggleSaved(item.id)}
                      className={`grid min-h-12 w-14 place-items-center rounded-xl border shadow-[0_16px_34px_rgba(0,0,0,0.22)] transition hover:-translate-y-0.5 active:scale-[0.96] ${saved
                        ? "border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)] text-white"
                        : "border-white/70 bg-white text-[var(--color-brand-primary)]"
                        }`}
                      aria-label={saved ? "Remove from wishlist" : "Save event"}
                    >
                      <Heart className="size-5" fill="currentColor" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="buizz-site-container-wide grid items-start gap-5 py-5 sm:gap-6 sm:py-6 xl:grid-cols-[minmax(0,1fr)_390px] 2xl:grid-cols-[minmax(0,1fr)_430px]">
          <div className="min-w-0 space-y-4 sm:space-y-5 xl:col-start-1 xl:row-start-1">
            <DetailSection title="About Event">
              <p className="text-sm font-semibold leading-7 text-[var(--app-muted)] sm:text-base">
                {aboutEventText}
              </p>
            </DetailSection>

            <DetailSection title={item.kind === "plays" ? "Cast and Crew" : "Details"}>
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailChip label="Category" value={item.category} />
                <DetailChip label="Language" value={item.language ?? "English"} />
                <DetailChip label="Duration" value={publishedDuration} />
                <DetailChip label="Age group" value={publishedAgeRestriction} />
              </div>
            </DetailSection>

            {dynamicOfferCards.length ? (
              <DetailSection title="Offers & Deals">
                <div className="grid grid-cols-2 gap-3">
                  {dynamicOfferCards.map((offer) => (
                    <article
                      key={offer.title}
                      className={`min-h-[132px] overflow-hidden rounded-2xl bg-gradient-to-br ${offer.tone} p-3 text-white shadow-[0_18px_40px_rgba(102,38,185,0.18)] sm:min-h-[150px] sm:p-4`}
                    >
                      <Gift className="size-5" />
                      <h3 className="mt-4 line-clamp-2 text-[15px] font-black leading-tight sm:text-lg">
                        {offer.title}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-[12px] font-semibold leading-5 text-white/82 sm:text-sm">
                        {offer.detail}
                      </p>
                    </article>
                  ))}
                </div>
              </DetailSection>
            ) : null}

            <PremiumMediaShowcase item={item} />

            <DetailSection title="Terms & Conditions">
              <button
                type="button"
                onClick={() => setTermsOpen(true)}
                className="flex min-h-12 w-full items-center justify-between rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] px-4 text-left text-sm font-black"
              >
                View entry, cancellation, and venue rules
                <span className="text-[var(--color-brand-primary)]">+</span>
              </button>
            </DetailSection>

            {upcomingItems.length ? (
              <DetailSection title="Upcoming Events">
                {upcomingSectionDescription ? (
                  <p className="text-xs font-semibold leading-5 text-[var(--app-muted)] sm:text-sm">
                    {upcomingSectionDescription}
                  </p>
                ) : null}

                <div className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] sm:gap-4 [&::-webkit-scrollbar]:hidden">
                  {upcomingItems.map((upcoming) => (
                    <UpcomingEventCard key={`${upcoming.kind}-${upcoming.id}`} item={upcoming} />
                  ))}
                </div>
              </DetailSection>
            ) : null}
          </div>

          <BookingInfoCard
            item={item}
            event={detailEvent}
            venue={displayVenue}
            city={item.city}
            bookingLabel={bookingLabel}
            priceLabel={normalizedPriceLabel}
            bookingHref={bookingHref}
            sticky
            className="order-first xl:order-none xl:col-start-2 xl:row-start-1 xl:self-start" />
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--app-border)] bg-[var(--app-card)]/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-12px_40px_rgba(15,23,42,0.16)] backdrop-blur-xl xl:hidden">
        <div className="mx-auto flex max-w-[720px] items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-[var(--app-muted)]">Price</p>
            <p className="truncate text-lg font-black">{normalizedPriceLabel}</p>
          </div>

          <Link
            href={bookingHref}
            className={`inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl px-4 text-sm font-black !text-white sm:min-h-12 sm:px-6 ${brandGradient}`}
          >
            {bookingLabel}
          </Link>
        </div>
      </div>

      {termsOpen ? <TermsModal terms={publishedTerms} onClose={() => setTermsOpen(false)} /> : null}

      <Footer />
    </>
  );
}




type TicketTypePreview = {
  name: string;
  seatBlockType: string;
  price: number;
  benefits: string[];
  instruction: string;
};

function TicketTypePreviewCard({
  item,
  ticketType,
}: {
  item: DiscoveryItem;
  ticketType: TicketTypePreview;
}) {
  const theme = resolveTicketTheme({
    eventCategory: item.category,
    eventType: item.genre,
    ticketType: ticketType.name,
    seatBlockType: ticketType.seatBlockType,
  });

  return (
    <article className="grid min-h-[172px] overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-foreground)] shadow-[0_14px_34px_rgba(15,11,26,0.06)] sm:grid-cols-[112px_minmax(0,1fr)]">
      <div className="relative min-h-32 overflow-hidden">
        <img src={item.image} alt="" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
        <span className="absolute left-2 top-2 rounded-md bg-[var(--color-brand-primary)] px-2 py-1 text-[10px] font-black uppercase text-white">
          {theme.badgeLabel}
        </span>
      </div>

      <div className="grid content-between gap-3 p-4">
        <div>
          <p className="text-lg font-black">{ticketType.name}</p>
          <p className="mt-1 text-xs font-bold text-[var(--app-muted)]">
            {ticketType.seatBlockType} / {theme.label}
          </p>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase text-[var(--app-muted)]">From</p>
            <p className="text-xl font-black">Rs. {ticketType.price.toLocaleString("en-IN")}</p>
          </div>

          <div className="flex flex-wrap justify-end gap-1.5">
            {ticketType.benefits.slice(0, 2).map((benefit) => (
              <span
                key={benefit}
                className="rounded-full bg-[var(--app-subtle)] px-2 py-1 text-[10px] font-bold text-[var(--color-brand-primary)]"
              >
                {benefit}
              </span>
            ))}
          </div>
        </div>

        <p className="text-xs font-semibold leading-5 text-[var(--app-muted)]">
          {ticketType.instruction}
        </p>
      </div>
    </article>
  );
}

function buildTicketTypePreviews(item: DiscoveryItem): TicketTypePreview[] {
  const base = Math.max(item.price || 399, 199);

  return [
    {
      name: "General Pass",
      seatBlockType: "General Admission",
      price: base,
      benefits: ["QR entry", "Standard access"],
      instruction: "Use the main gate and keep the QR open before reaching security.",
    },
    {
      name: "VIP Pass",
      seatBlockType: "VIP Lounge",
      price: base + 1200,
      benefits: ["Priority entry", "Premium zone"],
      instruction: "Use the VIP gate printed on the final ticket.",
    },
    {
      name: "Student Pass",
      seatBlockType: "Hall",
      price: Math.max(199, base - 150),
      benefits: ["Student pricing", "QR entry"],
      instruction: "Carry a valid student ID for verification at entry.",
    },
    {
      name: "Table for 4",
      seatBlockType: "Table",
      price: base * 4 + 1800,
      benefits: ["Reserved table", "Group entry"],
      instruction: "The complete party should arrive together at the table-booking gate.",
    },
  ];
}

export function EventDetailPage({ item }: { item: DiscoveryItem }) {
  return <ListingDetailPage item={item} />;
}

function TrailerSection({ item, title }: { item: DiscoveryItem; title: string }) {
  const links = [
    item.youtubeUrl ? { label: "YouTube", href: item.youtubeUrl, icon: "youtube" as const } : null,
    item.instagramUrl ? { label: "Instagram", href: item.instagramUrl, icon: "instagram" as const } : null,
  ].filter((link): link is { label: string; href: string; icon: "youtube" | "instagram" } => Boolean(link));

  const youtubeEmbedUrl = item.youtubeUrl ? getYoutubeEmbedUrl(item.youtubeUrl) : null;

  if (!links.length) return null;

  return (
    <DetailSection title={youtubeEmbedUrl ? "Watch Trailer" : "Social Links"}>
      <div className="max-w-[720px] overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)]">
        {youtubeEmbedUrl ? (
          <div className="aspect-video max-h-[360px] w-full bg-[var(--app-subtle)]">
            <iframe
              className="size-full"
              src={youtubeEmbedUrl}
              title={`${title} trailer`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="grid min-h-[150px] place-items-center bg-[var(--app-subtle)] px-5 text-center">
            <p className="max-w-md text-sm font-semibold leading-6 text-[var(--app-muted)]">
              Follow the organizer for latest updates, reels, and venue announcements.
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2 p-3">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[var(--app-border)] bg-[var(--app-subtle)] px-4 text-sm font-black text-[var(--color-brand-primary)] transition hover:-translate-y-0.5 hover:border-[var(--color-brand-primary)]/45"
            >
              <TrailerSocialIcon name={link.icon} />
              {link.label}
              <ExternalLink className="size-3.5" />
            </a>
          ))}
        </div>
      </div>
    </DetailSection>
  );
}

function getYoutubeEmbedUrl(value: string) {
  try {
    const url = new URL(value);

    if (url.hostname.includes("youtube.com") && url.pathname.startsWith("/embed/")) {
      return url.toString();
    }

    if (url.hostname.includes("youtube.com")) {
      const videoId = url.searchParams.get("v");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    if (url.hostname.includes("youtu.be")) {
      const videoId = url.pathname.replace("/", "");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }
  } catch {
    return null;
  }

  return null;
}

function TrailerSocialIcon({ name }: { name: "youtube" | "instagram" }) {
  if (name === "instagram") {
    return (
      <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="4" width="16" height="16" rx="5" />
        <circle cx="12" cy="12" r="3.5" />
        <circle cx="17" cy="7" r="0.8" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  return (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M21 8.2a3 3 0 0 0-2.1-2.1C17 5.5 12 5.5 12 5.5s-5 0-6.9.6A3 3 0 0 0 3 8.2 31 31 0 0 0 2.5 12a31 31 0 0 0 .5 3.8 3 3 0 0 0 2.1 2.1c1.9.6 6.9.6 6.9.6s5 0 6.9-.6a3 3 0 0 0 2.1-2.1c.4-1.4.5-3.8.5-3.8s0-2.4-.5-3.8ZM10 15.3V8.7l5.7 3.3-5.7 3.3Z" />
    </svg>
  );
}

function BookingInfoCard({
  item,
  event,
  venue,
  city,
  bookingLabel,
  priceLabel,
  bookingHref,
  sticky = false,
  className = "",
}: {
  item: DiscoveryItem;
  event: UnifiedBuizzEvent | null;
  venue: string;
  city: string;
  bookingLabel: string;
  priceLabel: string;
  bookingHref: string;
  sticky?: boolean;
  className?: string;
}) {
  const primaryDateTime =
    getDynamicOrganizerText(event, ["displaySchedule", "scheduleLabel", "dateTimeLabel", "selectedSlot", "timeSlot", "slot"]) ||
    (event?.date && event?.time ? `${event.date} at ${event.time}` : "") ||
    item.slot ||
    item.date ||
    "Time will be updated";

  const language = getDynamicOrganizerText(event, ["language", "languages", "eventLanguage"]) || item.language || "Language pending";
  const ageLabel = getPublishedAgeRestriction(item, event);
  const durationLabel = getPublishedDuration(item, event);
  const statusLabel = getDynamicOrganizerText(event, ["bookingStatus", "availabilityStatus", "salesStatus", "ticketStatus"]) || (item.popularity > 86 ? "Filling Fast" : "Available");

  return (
    <aside
      className={cn(
        sticky &&
        "xl:sticky xl:top-28 xl:self-start xl:max-h-[calc(100vh-8rem)] xl:overflow-y-auto",
        className,
        "h-max rounded-[24px] border border-[var(--app-border)] bg-[var(--app-card)]/95 p-3 text-[var(--app-foreground)] shadow-[0_18px_52px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:rounded-[28px] sm:p-5 xl:rounded-[32px]"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--app-muted)] sm:text-xs">
            Starting from
          </p>

          <p className="mt-1 truncate text-[22px] font-black tracking-[-0.04em] text-[var(--app-foreground)] sm:text-3xl">
            {priceLabel}
          </p>
        </div>

        <span className="shrink-0 rounded-full bg-[#22C55E]/10 px-2.5 py-1 text-[10px] font-black text-[#16A34A] sm:px-3 sm:text-xs">
          {statusLabel}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-1">
        <InfoLineCard
          icon={<CalendarDays className="size-4 text-[var(--color-brand-primary)]" />}
          label="Slot"
          value={primaryDateTime}
        />

        <InfoLineCard
          icon={<Users className="size-4 text-[var(--color-brand-primary)]" />}
          label="Age"
          value={ageLabel}
        />

        <InfoLineCard
          icon={<Ticket className="size-4 text-[var(--color-brand-primary)]" />}
          label="Language"
          value={language}
        />

        <InfoLineCard
          icon={<CalendarDays className="size-4 text-[var(--color-brand-primary)]" />}
          label="Duration"
          value={durationLabel}
        />

        <InfoLineCard
          icon={<MapPin className="size-4 text-[var(--color-brand-primary)]" />}
          label="Venue"
          value={`${venue}, ${city}`}
          className="col-span-2 xl:col-span-1"
        />
      </div>

      <Link
        href={bookingHref}
        className={`mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-2xl px-4 text-sm font-black !text-white shadow-[0_16px_34px_rgba(102,38,185,0.24)] transition hover:-translate-y-0.5 active:scale-[0.98] sm:min-h-12 sm:text-base ${brandGradient}`}
      >
        {bookingLabel}
      </Link>

      <div className="mt-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3">
        <div className="flex items-center gap-2">
          <BuizzLogo size="sm" />
        </div>

        <p className="mt-2 text-[11px] font-semibold leading-5 text-[var(--app-muted)] sm:text-xs">
          Secure checkout, QR delivery, WhatsApp-ready ticket actions.
        </p>
      </div>
    </aside>
  );
}

function InfoLineCard({
  icon,
  label,
  value,
  className = "",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[var(--app-card)] shadow-sm">
          {icon}
        </span>

        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[var(--app-muted)]">
            {label}
          </p>

          <p className="mt-0.5 line-clamp-2 text-[11px] font-black leading-4 text-[var(--app-foreground)] sm:text-xs">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] p-4 text-[var(--app-foreground)] shadow-[0_14px_34px_rgba(15,11,26,0.05)] sm:p-5">
      <h2 className="text-xl font-black sm:text-2xl">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function DetailChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-4">
      <p className="text-xs font-black uppercase text-[var(--app-muted)]">{label}</p>
      <p className="mt-1 break-words text-sm font-black">{value}</p>
    </div>
  );
}


function TermsModal({ terms, onClose }: { terms: string[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/65 p-0 sm:place-items-center sm:p-4">
      <section className="relative max-h-[86dvh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-[var(--app-card)] p-5 text-[var(--app-foreground)] shadow-2xl sm:rounded-3xl sm:p-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-[var(--app-subtle)] text-xl font-black"
          aria-label="Close terms"
        >
          <X className="size-4" />
        </button>

        <h2 className="text-2xl font-black sm:text-3xl">Terms & Conditions</h2>

        <ul className="mt-6 grid gap-3 pl-5 text-sm font-semibold leading-7 sm:text-base">
          {terms.map((term) => (
            <li key={term} className="list-disc">
              {term}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Meta({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <p className="flex min-w-0 items-center gap-2">
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{text}</span>
    </p>
  );
}

function Know({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex min-h-14 items-center gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-3 text-xs font-black">
      <span className="shrink-0 text-[var(--color-brand-primary)]">{icon}</span>
      <span className="min-w-0 break-words">{label}</span>
    </div>
  );
}

function UpcomingEventCard({ item }: { item: DiscoveryItem }) {
  return (
    <Link
      href={getListingDetailHref(item)}
      className="group w-40 shrink-0 snap-start overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] transition duration-200 hover:-translate-y-1 hover:border-[var(--color-brand-primary)]/45 min-[380px]:w-44 sm:w-52 2xl:w-60"
    >
      <div className="relative aspect-[1.05/1] overflow-hidden bg-[var(--app-subtle)] sm:aspect-video">
        <img
          src={item.image}
          alt={item.title}
          className="size-full object-cover transition duration-300 group-hover:scale-105"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/10 to-transparent" />

        <span className="absolute left-2 top-2 rounded-md bg-[var(--color-brand-primary)] px-2 py-1 text-[9px] font-black uppercase text-white">
          {item.kind}
        </span>

        <p className="absolute bottom-2 left-2 right-2 line-clamp-1 text-[11px] font-black text-white">
          {item.city}
        </p>
      </div>

      <div className="p-3">
        <p className="line-clamp-2 text-sm font-black leading-tight text-[var(--app-foreground)]">
          {item.title}
        </p>

        <p className="mt-1 line-clamp-1 text-xs font-bold text-[var(--app-muted)]">
          {item.slot ?? item.date}
        </p>

        <p className="mt-1 line-clamp-1 text-xs font-bold text-[var(--app-muted)]">
          {item.venue}, {item.city}
        </p>

        <p className="mt-2 text-sm font-black text-[var(--app-foreground)]">
          {getBookingPriceLabel(item)}
        </p>
      </div>
    </Link>
  );
}

function getBookingPriceLabel(item: DiscoveryItem) {
  if (item.price <= 0) return "Free";
  return `\u20B9${item.price.toLocaleString("en-IN")} onwards`;
}
