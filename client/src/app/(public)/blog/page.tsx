import { Footer } from "@/components/common/Footer";
import { NewsletterSection } from "@/features/blog/NewsletterSection";
import {
  blogCategories,
  blogPosts,
  type BlogCategory,
} from "@/features/blog/blog-data";
import {
  ArrowRight,
  CalendarDays,
  Clock,
  Search,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";

type BlogPageProps = {
  searchParams?: Promise<{
    category?: string;
    q?: string;
  }>;
};

const blogImages: Record<string, string> = {
  "best-weekend-events":
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1400&q=80",
  "qr-ticket-entry":
    "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1400&q=80",
  "top-activities-this-month":
    "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1400&q=80",
  "successful-organizer-dashboard":
    "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1400&q=80",
  "best-plays-with-family":
    "https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=1400&q=80",
  "local-community-experiences":
    "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1400&q=80",
};

function getBlogImage(slug: string) {
  return (
    blogImages[slug] ||
    "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1400&q=80"
  );
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const params = await searchParams;
  const activeCategory = (params?.category || "All") as BlogCategory;
  const query = (params?.q || "").toLowerCase();

  const filteredPosts = blogPosts.filter((post) => {
    const categoryMatch =
      activeCategory === "All" || post.category === activeCategory;

    const searchMatch =
      !query ||
      post.title.toLowerCase().includes(query) ||
      post.excerpt.toLowerCase().includes(query) ||
      post.category.toLowerCase().includes(query);

    return categoryMatch && searchMatch;
  });

  const featuredPost = blogPosts[0];

  return (
    <>
      <main className="relative isolate min-h-screen bg-[var(--app-background)] text-[var(--app-foreground)]">
        <section className="relative overflow-hidden px-4 py-16 sm:px-6 lg:px-8 lg:py-28">
          <div className="absolute inset-0 -z-10">
            <img
              src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1900&q=80"
              alt="Buizz blog stories"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-black/70" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(236,27,114,0.58),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(102,38,185,0.55),transparent_36%)]" />
          </div>

          <div className="relative mx-auto max-w-[1600px]">
            <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white backdrop-blur-xl sm:text-sm">
                  {/* <Sparkles size={15} /> */}
                  Buizz Stories
                </div>

                <h1 className="mt-5 text-4xl font-black leading-tight text-white sm:mt-6 sm:text-6xl lg:text-7xl">
                  Stories for event lovers and organizers
                </h1>

                <p className="mt-5 max-w-2xl text-sm leading-7 text-white/80 sm:mt-6 sm:text-lg sm:leading-8">
                  Explore event guides, booking tips, activity ideas, play
                  recommendations, organizer insights, and platform updates from
                  Buizz.
                </p>

                <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row">
                  <Link
                    href="#latest-blogs"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-brand-primary)] px-6 py-3 text-sm font-bold text-white shadow-[0_15px_40px_var(--color-glow)] transition hover:-translate-y-1 hover:opacity-90 sm:px-7"
                  >
                    Explore Blogs <ArrowRight size={17} />
                  </Link>

                  <Link
                    href="#newsletter"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/20 sm:px-7"
                  >
                    Subscribe Updates
                  </Link>
                </div>
              </div>

              <Link
                href={`/blog/${featuredPost.slug}`}
                className="group relative hidden lg:block"
              >
                <div className="absolute -left-6 top-8 z-10 rounded-3xl border border-white/15 bg-white/10 p-4 text-white shadow-2xl backdrop-blur-xl">
                  <p className="text-xs font-bold text-white/70">Featured</p>
                  <p className="mt-1 text-2xl font-black">Editor’s pick</p>
                </div>

                <div className="rotate-2 rounded-[2.5rem] border border-white/15 bg-white/10 p-4 shadow-[0_30px_90px_rgba(0,0,0,0.4)] backdrop-blur-xl transition group-hover:rotate-0">
                  <div className="relative overflow-hidden rounded-[2rem]">
                    <img
                      src={getBlogImage(featuredPost.slug)}
                      alt={featuredPost.title}
                      className="h-[460px] w-full object-cover transition duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

                    <div className="absolute bottom-6 left-6 right-6 text-white">
                      <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/70">
                        Featured story
                      </p>
                      <h2 className="mt-3 text-3xl font-black">
                        {featuredPost.title}
                      </h2>
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-white/75">
                        {featuredPost.excerpt}
                      </p>

                      <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-slate-950">
                        Read Story
                        <ArrowRight
                          size={15}
                          className="transition group-hover:translate-x-1"
                        />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-2 sm:mt-14 sm:gap-4">
              <HeroStat
                icon={<CalendarDays size={18} />}
                label="Fresh guides"
                value="Updated regularly"
              />
              <HeroStat
                icon={<Users size={18} />}
                label="For everyone"
                value="Users + organizers"
              />
              <HeroStat
                icon={<Clock size={18} />}
                label="Quick reads"
                value="3-6 minutes"
              />
            </div>
          </div>
        </section>

        <section className="px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <div className="mx-auto max-w-[1600px]">
            <div className="rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-elevated)]/90 p-3 shadow-[0_18px_60px_rgba(0,0,0,0.08)] backdrop-blur-xl sm:rounded-[2rem] sm:p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="overflow-x-auto">
                  <div className="flex min-w-max gap-1.5 sm:gap-2">
                    {blogCategories.map((category) => (
                      <Link
                        key={category}
                        href={
                          category === "All"
                            ? "/blog"
                            : `/blog?category=${category}`
                        }
                        className={`whitespace-nowrap rounded-full border px-2.5 py-1.5 text-[11px] font-bold transition sm:px-4 sm:py-2 sm:text-sm ${activeCategory === category
                          ? "border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)] text-white shadow-[0_10px_30px_var(--color-glow)]"
                          : "border-[var(--app-border)] bg-[var(--app-subtle)] text-[var(--app-muted)] hover:border-[var(--color-brand-primary)] hover:bg-[var(--app-hover)] hover:text-[var(--color-brand-primary)]"
                          }`}
                      >
                        {category}
                      </Link>
                    ))}
                  </div>
                </div>

                <form action="/blog" className="relative w-full lg:max-w-sm">
                  {activeCategory !== "All" ? (
                    <input
                      type="hidden"
                      name="category"
                      value={activeCategory}
                    />
                  ) : null}

                  <Search
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--app-muted)]"
                  />
                  <input
                    name="q"
                    defaultValue={params?.q || ""}
                    placeholder="Search blogs..."
                    className="h-11 w-full rounded-full border border-[var(--app-border)] bg-[var(--app-input)] pl-10 pr-4 text-sm text-[var(--app-foreground)] outline-none transition placeholder:text-[var(--app-muted)] focus:border-[var(--color-brand-primary)] focus:bg-[var(--app-elevated)] sm:h-12"
                  />
                </form>
              </div>
            </div>
          </div>
        </section>

        <section id="latest-blogs" className="px-4 pb-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1600px]">
            <div className="mb-6 flex items-end justify-between gap-3 sm:mb-10">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--color-brand-primary)] sm:text-sm sm:tracking-[0.25em]">
                  Latest blogs
                </p>
                <h2 className="mt-1 text-2xl font-black sm:text-5xl">
                  Guides, stories and updates
                </h2>
              </div>

              <p className="shrink-0 text-xs font-semibold text-[var(--app-muted)] sm:text-sm">
                {filteredPosts.length} posts
              </p>
            </div>

            {filteredPosts.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredPosts.map((post) => (
                  <Link
                    key={post.slug}
                    href={`/blog/${post.slug}`}
                    className="group overflow-hidden rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-elevated)] shadow-[0_10px_35px_rgba(0,0,0,0.08)] transition hover:-translate-y-1 hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-card-hover)] hover:shadow-[0_20px_65px_var(--color-glow)] sm:rounded-[2rem]"
                  >
                    <div className="relative h-48 overflow-hidden sm:h-64">
                      <img
                        src={getBlogImage(post.slug)}
                        alt={post.title}
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />

                      <div className="absolute bottom-4 left-4 right-4 sm:bottom-5 sm:left-5 sm:right-5">
                        <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-black text-white backdrop-blur sm:text-xs">
                          {post.category}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 sm:p-5">
                      <div className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
                        <span className="text-[11px] font-semibold text-[var(--app-muted)] sm:text-xs">
                          {post.date}
                        </span>
                        <span className="text-[11px] font-semibold text-[var(--app-muted)] sm:text-xs">
                          {post.readTime}
                        </span>
                      </div>

                      <h3 className="text-lg font-black leading-snug text-[var(--app-foreground)] sm:text-xl">
                        {post.title}
                      </h3>

                      <p className="mt-3 line-clamp-3 text-xs leading-6 text-[var(--app-muted)] sm:text-sm">
                        {post.excerpt}
                      </p>

                      <span className="mt-4 inline-flex items-center gap-1 text-sm font-black text-[var(--color-brand-primary)] sm:mt-5">
                        Read more
                        <ArrowRight
                          size={15}
                          className="transition group-hover:translate-x-1"
                        />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-[2rem] border border-[var(--app-border)] bg-[var(--app-elevated)] p-8 text-center shadow-[0_10px_35px_rgba(0,0,0,0.08)] sm:p-10">
                <h3 className="text-2xl font-black">No blogs found</h3>
                <p className="mt-2 text-[var(--app-muted)]">
                  Try another category or search keyword.
                </p>
                <Link
                  href="/blog"
                  className="mt-6 inline-flex rounded-full bg-[var(--color-brand-primary)] px-6 py-3 text-sm font-bold text-white shadow-[0_10px_30px_var(--color-glow)]"
                >
                  Reset Filters
                </Link>
              </div>
            )}
          </div>
        </section>

        <section className="bg-[var(--app-subtle)]/80 px-4 py-14 backdrop-blur-sm sm:px-6 sm:py-16 lg:px-8">
          <div className="mx-auto max-w-[1600px]">
            <div className="text-center">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--color-brand-primary)] sm:text-sm sm:tracking-[0.25em]">
                Explore by Experience
              </p>

              <h2 className="mt-2 text-3xl font-black sm:text-5xl">
                Stories for every kind of experience
              </h2>

              <p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-[var(--app-muted)]">
                Discover event inspiration, family plans, activity ideas,
                organizer insights, and booking guides curated by Buizz.
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <ExperienceCard
                image="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80"
                title="Event Guides"
                text="Weekend plans, concerts, workshops and city experiences."
              />
              <ExperienceCard
                image="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80"
                title="Activities & Fun"
                text="Adventure zones, VR experiences, family activities and more."
              />
              <ExperienceCard
                image="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80"
                title="Organizer Insights"
                text="Learn how successful organizers grow events with Buizz."
              />
            </div>
          </div>
        </section>

        <section id="newsletter" className="px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <div className="mx-auto max-w-[1600px] overflow-hidden rounded-[2rem] border border-[var(--app-border)] bg-[var(--app-elevated)] shadow-[0_30px_90px_rgba(0,0,0,0.12)] sm:rounded-[3rem]">
            <div className="grid gap-0 lg:grid-cols-[1fr_0.9fr] lg:items-center">
              <div className="p-6 sm:p-10 lg:p-12">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--color-brand-primary)] sm:text-sm sm:tracking-[0.25em]">
                  Stay Connected
                </p>

                <h2 className="mt-3 text-3xl font-black leading-tight sm:mt-4 sm:text-5xl">
                  Never miss the next experience
                </h2>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--app-muted)] sm:mt-5">
                  Receive curated event guides, activity recommendations, family
                  plans, organizer insights, and the latest updates from Buizz.
                </p>

                <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row">
                  <input
                    type="email"
                    placeholder="Enter your email address"
                    className="h-12 flex-1 rounded-full border border-[var(--app-border)] bg-[var(--app-input)] px-5 text-sm text-[var(--app-foreground)] outline-none placeholder:text-[var(--app-muted)] focus:border-[var(--color-brand-primary)] sm:h-14"
                  />

                  <button className="h-12 rounded-full bg-[var(--color-brand-primary)] px-6 text-sm font-bold text-white shadow-[0_15px_40px_var(--color-glow)] transition hover:-translate-y-1 sm:h-14 sm:px-8">
                    Join Community
                  </button>
                </div>

                <p className="mt-4 text-xs font-semibold text-[var(--app-muted)]">
                  No spam. Only valuable stories and updates.
                </p>
              </div>

              <div className="hidden lg:block">
                <img
                  src="https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1400&q=80"
                  className="h-full min-h-[440px] w-full object-cover"
                  alt="Buizz community"
                />
              </div>
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

function HeroStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-3 text-white shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:rounded-3xl sm:p-5">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-white/10 sm:mb-4 sm:h-11 sm:w-11 sm:rounded-2xl">
        {icon}
      </div>

      <p className="text-[10px] font-semibold text-white/65 sm:text-sm">
        {label}
      </p>

      <p className="mt-1 text-xs font-black text-white sm:text-base">
        {value}
      </p>
    </div>
  );
}

function ExperienceCard({
  image,
  title,
  text,
}: {
  image: string;
  title: string;
  text: string;
}) {
  return (
    <div className="group overflow-hidden rounded-[1.5rem] border border-[var(--app-border)] bg-[var(--app-elevated)] shadow-[0_10px_35px_rgba(0,0,0,0.08)] transition hover:-translate-y-1 hover:border-[var(--color-brand-primary)] hover:shadow-[0_20px_65px_var(--color-glow)] sm:rounded-[2rem]">
      <img
        src={image}
        className="h-44 w-full object-cover transition duration-700 group-hover:scale-105 sm:h-60"
        alt={title}
      />

      <div className="p-4 sm:p-6">
        <h3 className="text-xl font-black sm:text-2xl">{title}</h3>

        <p className="mt-3 text-sm leading-6 text-[var(--app-muted)]">
          {text}
        </p>
      </div>
    </div>
  );
}

