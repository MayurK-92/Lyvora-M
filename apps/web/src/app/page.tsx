import Link from "next/link";
import { redirect } from "next/navigation";
import { Button, MaterialIcon, type IconName } from "@lyvora/ui";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { getAuthenticatedUser } from "@/lib/auth/session";

const PILLARS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "sync",
    title: "Capture anything",
    body: "Links, notes, PDFs and images all land in one place, in one tap.",
  },
  {
    icon: "psychology",
    title: "Understood for you",
    body: "Every save is read, summarised, categorised and tagged automatically.",
  },
  {
    icon: "hub",
    title: "Connected knowledge",
    body: "Search it, chat with it, or explore the graph your memories form.",
  },
];

function ProductMock() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto w-full max-w-md overflow-hidden rounded-2xl bg-surface-container-lowest shadow-[0_24px_60px_rgba(24,36,66,0.16)]"
    >
      <span className="absolute inset-y-0 left-0 w-1 bg-tertiary-fixed-dim" />
      <div className="flex items-center gap-sm border-b border-outline-variant/30 px-md py-sm pl-lg">
        <BrandLockup
          size={20}
          wordmarkClassName="text-label-md text-on-surface"
        />
        <span className="ml-auto text-label-sm font-normal text-on-surface-variant">
          Just saved
        </span>
      </div>

      <div className="p-md pl-lg">
        <div className="mb-sm flex items-center justify-between gap-sm">
          <span className="inline-flex items-center gap-1 rounded-full bg-tertiary-fixed px-2 py-1 text-label-sm text-on-tertiary-fixed">
            <MaterialIcon name="restaurant_menu" size={16} />
            Recipes
          </span>
          <span className="text-label-sm font-normal text-on-surface-variant">Today</span>
        </div>
        <h3 className="text-headline-md text-on-surface">
          Crispy garlic smashed potatoes
        </h3>
        <p className="mt-xs line-clamp-2 text-body-md text-on-surface-variant">
          Boil, smash, roast hot — golden edges, soft centers, and a garlic oil finish
          that keeps for leftovers.
        </p>
        <div className="mt-md flex flex-wrap gap-xs">
          {["#weeknight", "#vegetarian", "#crispy"].map((tag) => (
            <span
              key={tag}
              className="text-label-sm font-normal text-on-surface-variant"
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="mt-md grid grid-cols-3 gap-sm border-t border-outline-variant/30 pt-md">
          {[
            { label: "Time", value: "45 min" },
            { label: "Servings", value: "4" },
            { label: "Level", value: "Easy" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg bg-surface-container-low px-sm py-xs">
              <p className="text-label-sm font-normal text-on-surface-variant">
                {stat.label}
              </p>
              <p className="text-label-md text-on-surface">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function MarketingPage() {
  const user = await getAuthenticatedUser();
  if (user) {
    redirect("/home");
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-surface">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -top-40 size-[28rem] rounded-full bg-primary-fixed/40 blur-3xl mix-blend-multiply"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -left-32 size-[24rem] rounded-full bg-tertiary-fixed/40 blur-3xl mix-blend-multiply"
      />

      <header className="relative z-10 mx-auto flex w-full max-w-page items-center justify-between px-md py-lg md:px-xl">
        <BrandLockup size={32} />
        <Button
          asChild
          variant="outline"
          size="md"
          shape="pill"
          className="transition-all duration-200 hover:bg-primary hover:text-on-primary hover:shadow-md"
        >
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </header>

      <main
        id="main-content"
        className="relative z-10 mx-auto flex w-full max-w-page flex-1 flex-col items-center gap-2xl px-md pb-2xl pt-lg md:px-xl lg:flex-row lg:items-center lg:justify-between"
      >
        <div className="max-w-xl text-center lg:text-left">
          <span className="inline-flex items-center gap-xs rounded-full bg-secondary-container px-3 py-1 text-label-sm text-on-secondary-container">
            <MaterialIcon name="auto_awesome" size={16} />
            Your digital mind
          </span>
          <h1 className="mt-md text-balance text-headline-lg tracking-tight text-on-surface sm:text-display-lg">
            Everything worth remembering, remembered.
          </h1>
          <p className="mx-auto mt-md max-w-md text-balance text-body-lg text-on-surface-variant lg:mx-0">
            Save a link, a PDF, an image, or a thought. Lyvora reads it, understands it,
            and turns it into knowledge you can find again.
          </p>
          <div className="mt-xl flex items-center justify-center gap-md lg:justify-start">
            <Button
              asChild
              size="xl"
              className="transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-container hover:text-on-primary hover:shadow-lg"
            >
              <Link href="/sign-in">
                Start remembering
                <MaterialIcon name="arrow_forward" size={18} />
              </Link>
            </Button>
          </div>
        </div>

        <div className="animate-page-enter w-full max-w-md">
          <ProductMock />
        </div>
      </main>

      <section className="relative z-10 mx-auto w-full max-w-page px-md pb-2xl md:px-xl">
        <ul className="grid grid-cols-1 gap-md sm:grid-cols-3">
          {PILLARS.map((pillar) => (
            <li
              key={pillar.title}
              className="rounded-2xl bg-surface-container-low p-lg transition-transform duration-200 hover:-translate-y-1"
            >
              <span className="mb-sm flex size-10 items-center justify-center rounded-lg bg-secondary-container text-on-secondary-container">
                <MaterialIcon name={pillar.icon} size={20} />
              </span>
              <h2 className="text-headline-md text-on-surface">{pillar.title}</h2>
              <p className="mt-xs text-body-md text-on-surface-variant">{pillar.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <footer className="relative z-10 px-md py-xl text-center text-label-sm font-normal text-on-surface-variant">
        Lyvora — a memory layer for the internet.
      </footer>
    </div>
  );
}
