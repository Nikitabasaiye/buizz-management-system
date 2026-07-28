export type BlogCategory =
  | "All"
  | "Event Guides"
  | "Activities"
  | "Plays"
  | "Organizer Tips"
  | "Product Updates";

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: Exclude<BlogCategory, "All">;
  author: string;
  date: string;
  readTime: string;
  heroGradient: string;
  content: string[];
};

export const blogCategories: BlogCategory[] = [
  "All",
  "Event Guides",
  "Activities",
  "Plays",
  "Organizer Tips",
  "Product Updates",
];

export const blogPosts: BlogPost[] = [
  {
    slug: "best-weekend-events",
    title: "How to choose the right weekend event for your plan",
    excerpt:
      "A practical guide to finding concerts, workshops, activities, and plays that match your mood, budget, group size, and city.",
    category: "Event Guides",
    author: "Buizz Editorial",
    date: "Jun 18, 2026",
    readTime: "4 min read",
    heroGradient: "from-pink-500 via-purple-500 to-indigo-600",
    content: [
      "Weekend planning becomes easier when users can compare experiences by category, location, price, timing, and group preference.",
      "Buizz is designed to make discovery simple by helping customers move from browsing to booking without confusion.",
      "For production, this type of guide can later include city-specific recommendations, trending events, organizer highlights, and personalized suggestions.",
    ],
  },
  {
    slug: "qr-ticket-entry",
    title: "Why QR ticketing improves event entry experiences",
    excerpt:
      "QR-based tickets can reduce entry confusion, improve attendee validation, and make event check-in smoother for organizers.",
    category: "Product Updates",
    author: "Buizz Product Team",
    date: "Jun 16, 2026",
    readTime: "3 min read",
    heroGradient: "from-fuchsia-500 via-rose-500 to-orange-500",
    content: [
      "A smooth entry experience is important for both customers and organizers. QR tickets help make validation faster and more structured.",
      "In Buizz, QR ticket flows can support booking confirmation, ticket preview, customer ticket history, and organizer-side scanning.",
      "For backend integration, QR codes should be generated with secure signed tokens and validated server-side before entry is approved.",
    ],
  },
  {
    slug: "top-activities-this-month",
    title: "Activity ideas for friends, families, and teams",
    excerpt:
      "Explore activity-focused experiences such as VR games, creative workshops, adventure zones, and group-friendly plans.",
    category: "Activities",
    author: "Buizz Editorial",
    date: "Jun 14, 2026",
    readTime: "5 min read",
    heroGradient: "from-cyan-500 via-blue-500 to-purple-600",
    content: [
      "Activities are ideal for users who want something more interactive than a regular event or show.",
      "A strong activity listing should include duration, age suitability, group size, safety notes, venue details, pricing, and available time slots.",
      "Buizz can support activity discovery with filters, booking slots, favorites, and user-friendly details pages.",
    ],
  },
  {
    slug: "successful-organizer-dashboard",
    title: "What makes a useful organizer dashboard",
    excerpt:
      "A good organizer dashboard should help event owners manage listings, attendees, QR scanning, bookings, and performance insights.",
    category: "Organizer Tips",
    author: "Buizz Product Team",
    date: "Jun 12, 2026",
    readTime: "6 min read",
    heroGradient: "from-violet-500 via-purple-500 to-pink-500",
    content: [
      "Organizers need clarity more than complexity. A useful dashboard should show the most important actions first.",
      "Event creation, attendee tracking, booking overview, QR scanning, and analytics should be easy to access from one place.",
      "Buizz is structured to support organizer workflows while keeping the interface clean and integration-ready.",
    ],
  },
  {
    slug: "best-plays-with-family",
    title: "How to pick the right play for a family outing",
    excerpt:
      "A simple guide to choosing theatre, drama, comedy, and cultural performances that work well for families.",
    category: "Plays",
    author: "Buizz Editorial",
    date: "Jun 10, 2026",
    readTime: "4 min read",
    heroGradient: "from-amber-500 via-red-500 to-pink-600",
    content: [
      "Plays and theatre experiences are often chosen based on language, timing, age suitability, seating, and venue comfort.",
      "A clear play listing should help users understand the theme, duration, cast, venue, ticket types, and show timing.",
      "Buizz can make this journey easier by presenting play details in a clean and customer-friendly format.",
    ],
  },
  {
    slug: "local-community-experiences",
    title: "Why local experiences matter for modern cities",
    excerpt:
      "Community experiences help users explore culture, creativity, networking, learning, and entertainment around them.",
    category: "Event Guides",
    author: "Buizz Editorial",
    date: "Jun 08, 2026",
    readTime: "5 min read",
    heroGradient: "from-emerald-500 via-teal-500 to-cyan-600",
    content: [
      "Local experiences give people more reasons to explore their city and connect with communities.",
      "Workshops, open mics, heritage walks, cultural events, and community meetups can all become strong discovery categories.",
      "Buizz is built to support multiple experience types while keeping the booking journey simple and scalable.",
    ],
  },
];