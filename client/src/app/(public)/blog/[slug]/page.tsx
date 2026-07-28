import { Footer } from "@/components/common/Footer";
import { blogPosts } from "@/features/blog/blog-data";
import {
    ArrowLeft,
    ArrowRight,
    Bookmark,
    CalendarDays,
    Clock,
    Share2,
    Sparkles,
    UserRound,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FaFacebookF, FaLinkedinIn, FaTwitter } from "react-icons/fa";

type BlogDetailPageProps = {
    params: Promise<{
        slug: string;
    }>;
};

const blogImages: Record<string, string> = {
    "best-weekend-events":
        "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1600&q=80",
    "qr-ticket-entry":
        "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1600&q=80",
    "top-activities-this-month":
        "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1600&q=80",
    "successful-organizer-dashboard":
        "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1600&q=80",
    "best-plays-with-family":
        "https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=1600&q=80",
    "local-community-experiences":
        "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1600&q=80",
};

function getBlogImage(slug: string) {
    return (
        blogImages[slug] ||
        "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1600&q=80"
    );
}

// Removed generateStaticParams to make page fully dynamic
// export function generateStaticParams() {
//     return blogPosts.map((post) => ({
//         slug: post.slug,
//     }));
// }

export async function generateMetadata({ params }: BlogDetailPageProps) {
    const { slug } = await params;
    const post = blogPosts.find((item) => item.slug === slug);

    if (!post) {
        return {
            title: "Blog not found | Buizz",
        };
    }

    return {
        title: `${post.title} | Buizz Blog`,
        description: post.excerpt,
    };
}

export default async function BlogDetailPage({ params }: BlogDetailPageProps) {
    const { slug } = await params;
    const post = blogPosts.find((item) => item.slug === slug);

    if (!post) notFound();

    const currentIndex = blogPosts.findIndex((item) => item.slug === post.slug);
    const previousPost = currentIndex > 0 ? blogPosts[currentIndex - 1] : null;
    const nextPost =
        currentIndex < blogPosts.length - 1 ? blogPosts[currentIndex + 1] : null;

    const relatedPosts = blogPosts
        .filter((item) => item.slug !== post.slug)
        .filter((item) => item.category === post.category)
        .slice(0, 3);

    const finalRelatedPosts = relatedPosts.length
        ? relatedPosts
        : blogPosts.filter((item) => item.slug !== post.slug).slice(0, 3);

    return (
        <>
            <main className="relative isolate min-h-screen bg-[var(--app-background)] text-[var(--app-foreground)]">
                <section className="relative overflow-hidden px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
                    <div className="absolute inset-0 -z-10">
                        <img
                            src={getBlogImage(post.slug)}
                            alt={post.title}
                            className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/70" />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(236,27,114,0.58),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(102,38,185,0.55),transparent_36%)]" />
                    </div>

                    <div className="relative mx-auto max-w-[1600px]">
                        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
                            <Link
                                href="/blog"
                                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/20"
                            >
                                <ArrowLeft size={16} />
                                Back to blogs
                            </Link>

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/20"
                                >
                                    <Bookmark size={16} />
                                    Save
                                </button>

                                <button
                                    type="button"
                                    className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/20"
                                >
                                    <Share2 size={16} />
                                    Share
                                </button>
                            </div>
                        </div>

                        <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
                            <div>
                                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white backdrop-blur-xl">
                                    {post.category}
                                </div>

                                <h1 className="mt-6 max-w-4xl text-5xl font-black leading-tight text-white sm:text-6xl lg:text-7xl">
                                    {post.title}
                                </h1>

                                <p className="mt-6 max-w-2xl text-base leading-8 text-white/80 sm:text-lg">
                                    {post.excerpt}
                                </p>

                                <div className="mt-8 flex flex-wrap gap-4 text-sm font-semibold text-white/75">
                                    <span className="inline-flex items-center gap-2">
                                        <UserRound size={16} />
                                        {post.author}
                                    </span>
                                    <span className="inline-flex items-center gap-2">
                                        <CalendarDays size={16} />
                                        {post.date}
                                    </span>
                                    <span className="inline-flex items-center gap-2">
                                        <Clock size={16} />
                                        {post.readTime}
                                    </span>
                                </div>
                            </div>

                            <div className="relative hidden lg:block">
                                <div className="absolute -left-6 top-8 z-10 rounded-3xl border border-white/15 bg-white/10 p-4 text-white shadow-2xl backdrop-blur-xl">
                                    <p className="text-xs font-bold text-white/70">Reading</p>
                                    <p className="mt-1 text-2xl font-black">{post.readTime}</p>
                                </div>

                                <div className="rotate-2 rounded-[2.5rem] border border-white/15 bg-white/10 p-4 shadow-[0_30px_90px_rgba(0,0,0,0.4)] backdrop-blur-xl">
                                    <div className="overflow-hidden rounded-[2rem] bg-white">
                                        <img
                                            src={getBlogImage(post.slug)}
                                            alt={post.title}
                                            className="h-[460px] w-full object-cover"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="px-4 py-16 sm:px-6 lg:px-8">
                    <div className="mx-auto grid max-w-[1600px] gap-8 lg:grid-cols-[230px_1fr_230px]">
                        <aside className="hidden lg:block">
                            <div className="sticky top-24 rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                                <p className="text-xs font-black uppercase tracking-[0.25em] text-[var(--color-brand-primary)]">
                                    Contents
                                </p>

                                <div className="mt-4 space-y-3 text-sm font-semibold text-[var(--app-muted)]">
                                    {[
                                        ["#overview", "Overview"],
                                        ["#story", "Full story"],
                                        ["#buizz-value", "Buizz value"],
                                        ["#next-read", "Next read"],
                                        ["#related", "Related blogs"],
                                    ].map(([href, label]) => (
                                        <a
                                            key={href}
                                            href={href}
                                            className="block rounded-xl px-3 py-2 transition hover:bg-[var(--app-hover)] hover:text-[var(--color-brand-primary)]"
                                        >
                                            {label}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </aside>

                        <article className="rounded-[2rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-6 shadow-[0_12px_45px_rgba(0,0,0,0.08)] sm:p-10">
                            <div
                                id="overview"
                                className="mb-8 rounded-3xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-6"
                            >
                                <p className="text-sm font-black uppercase tracking-[0.2em] text-[var(--color-brand-primary)]">
                                    Quick overview
                                </p>
                                <p className="mt-3 text-base leading-7 text-[var(--app-muted)]">
                                    This article helps Buizz users discover better experiences,
                                    understand event booking, and explore how organizers can grow
                                    with a modern event platform.
                                </p>
                            </div>

                            <div id="story" className="space-y-6">
                                {post.content.map((paragraph) => (
                                    <p
                                        key={paragraph}
                                        className="text-base leading-8 text-[var(--app-muted)] sm:text-lg"
                                    >
                                        {paragraph}
                                    </p>
                                ))}
                            </div>

                            <div
                                id="buizz-value"
                                className="mt-10 rounded-3xl border border-[var(--app-border)] bg-[var(--app-subtle)] p-6"
                            >
                                <h2 className="text-2xl font-black text-[var(--app-foreground)]">
                                    Why this matters for Buizz
                                </h2>
                                <p className="mt-3 leading-7 text-[var(--app-muted)]">
                                    Blog content improves SEO, builds trust, helps customers
                                    discover events, supports city-based discovery, and makes the
                                    platform feel active and production-ready.
                                </p>
                            </div>

                            <div id="next-read" className="mt-10 grid gap-4 sm:grid-cols-2">
                                {previousPost ? (
                                    <Link
                                        href={`/blog/${previousPost.slug}`}
                                        className="group rounded-3xl border border-[var(--app-border)] bg-[var(--app-background)] p-5 transition hover:-translate-y-1 hover:border-[var(--color-brand-primary)] hover:bg-[var(--app-hover)] hover:shadow-[0_15px_50px_var(--color-glow)]"
                                    >
                                        <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--app-muted)]">
                                            Previous
                                        </p>
                                        <h3 className="mt-2 font-black text-[var(--app-foreground)]">
                                            {previousPost.title}
                                        </h3>
                                    </Link>
                                ) : (
                                    <div />
                                )}

                                {nextPost ? (
                                    <Link
                                        href={`/blog/${nextPost.slug}`}
                                        className="group rounded-3xl border border-[var(--app-border)] bg-[var(--app-background)] p-5 transition hover:-translate-y-1 hover:border-[var(--color-brand-primary)] hover:bg-[var(--app-hover)] hover:shadow-[0_15px_50px_var(--color-glow)] sm:text-right"
                                    >
                                        <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--app-muted)]">
                                            Next
                                        </p>
                                        <h3 className="mt-2 font-black text-[var(--app-foreground)]">
                                            {nextPost.title}
                                        </h3>
                                    </Link>
                                ) : null}
                            </div>
                        </article>

                        <aside className="hidden lg:block">
                            <div className="sticky top-24 space-y-4">
                                <div className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                                    <p className="text-xs font-black uppercase tracking-[0.25em] text-[var(--color-brand-primary)]">
                                        Share
                                    </p>

                                    <div className="mt-4 flex gap-2">
                                        <SocialIcon label="Facebook">
                                            <FaFacebookF size={15} />
                                        </SocialIcon>
                                        <SocialIcon label="LinkedIn">
                                            <FaLinkedinIn size={15} />
                                        </SocialIcon>
                                        <SocialIcon label="Twitter">
                                            <FaTwitter size={15} />
                                        </SocialIcon>
                                    </div>
                                </div>

                                <div className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-elevated)] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                                    <p className="text-xs font-black uppercase tracking-[0.25em] text-[var(--color-brand-primary)]">
                                        Blog Info
                                    </p>

                                    <div className="mt-4 space-y-3 text-sm text-[var(--app-muted)]">
                                        <p>
                                            <span className="font-black text-[var(--app-foreground)]">
                                                Category:
                                            </span>{" "}
                                            {post.category}
                                        </p>
                                        <p>
                                            <span className="font-black text-[var(--app-foreground)]">
                                                Author:
                                            </span>{" "}
                                            {post.author}
                                        </p>
                                        <p>
                                            <span className="font-black text-[var(--app-foreground)]">
                                                Reading Time:
                                            </span>{" "}
                                            {post.readTime}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </aside>
                    </div>
                </section>

                <section
                    id="related"
                    className="bg-[var(--app-subtle)] px-4 py-16 sm:px-6 lg:px-8"
                >
                    <div className="mx-auto max-w-[1600px]">
                        <div className="mb-10 flex items-end justify-between gap-4">
                            <div>
                                <p className="text-sm font-black uppercase tracking-[0.25em] text-[var(--color-brand-primary)]">
                                    Related
                                </p>
                                <h2 className="mt-2 text-3xl font-black sm:text-5xl">
                                    More stories
                                </h2>
                            </div>

                            <Link
                                href="/blog"
                                className="hidden text-sm font-black text-[var(--color-brand-primary)] transition hover:opacity-80 sm:inline-flex"
                            >
                                View all
                            </Link>
                        </div>

                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {finalRelatedPosts.map((item) => (
                                <Link
                                    key={item.slug}
                                    href={`/blog/${item.slug}`}
                                    className="group overflow-hidden rounded-[2rem] border border-[var(--app-border)] bg-[var(--app-elevated)] shadow-[0_10px_35px_rgba(0,0,0,0.08)] transition hover:-translate-y-1 hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-card-hover)] hover:shadow-[0_20px_65px_var(--color-glow)]"
                                >
                                    <div className="relative h-56 overflow-hidden">
                                        <img
                                            src={getBlogImage(item.slug)}
                                            alt={item.title}
                                            className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                                        <div className="absolute bottom-5 left-5 right-5">
                                            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black text-white backdrop-blur">
                                                {item.category}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="p-5">
                                        <h3 className="text-xl font-black text-[var(--app-foreground)]">
                                            {item.title}
                                        </h3>

                                        <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--app-muted)]">
                                            {item.excerpt}
                                        </p>

                                        <span className="mt-4 inline-flex items-center gap-1 text-sm font-black text-[var(--color-brand-primary)]">
                                            Read story
                                            <ArrowRight
                                                size={15}
                                                className="transition group-hover:translate-x-1"
                                            />
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            </main>

            <section className="relative z-10 bg-[var(--app-background)]">
                <Footer />
            </section>
        </>
    );
}

function SocialIcon({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <a
            href="#"
            aria-label={`Share on ${label}`}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--app-border)] bg-[var(--app-subtle)] text-[var(--app-muted)] transition hover:-translate-y-1 hover:border-[var(--color-brand-primary)] hover:bg-[var(--app-hover)] hover:text-[var(--color-brand-primary)]"
        >
            {children}
        </a>
    );
}
