import type { ReactNode } from "react";
import { coerceStructured, StructuredPayload } from "@lyvora/core";
import type { StructuredPayload as Payload } from "@lyvora/core";
import { MaterialIcon, type IconName } from "@lyvora/ui";

/** Panel matching the design's "Key Ingredients" / "Required Tools" cards. */
function Panel({ title, children }: { title: string; children: ReactNode }) {
  if (!children) return null;
  return (
    <section className="rounded-xl bg-surface-container-low p-md">
      <h3 className="mb-md text-label-md uppercase tracking-widest text-on-surface-variant">
        {title}
      </h3>
      {children}
    </section>
  );
}

/** Dot-prefixed pill, as used for ingredients in memory_detail_lyvora. */
const DOT_TONES = [
  "bg-tertiary-fixed-dim",
  "bg-primary-fixed-dim",
  "bg-secondary-fixed-dim",
  "bg-outline-variant",
];

function DotChips({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-sm">
      {items.map((item, index) => (
        <span
          key={`${item}-${index}`}
          className="flex items-center gap-xs rounded-lg bg-surface-container-highest px-sm py-xs text-body-md text-on-surface"
        >
          <span
            aria-hidden="true"
            className={`size-2 rounded-full ${DOT_TONES[index % DOT_TONES.length]}`}
          />
          {item}
        </span>
      ))}
    </div>
  );
}

/** Icon-prefixed pill, as used for tools in memory_detail_lyvora. */
function IconChips({ items, icon }: { items: string[]; icon: IconName }) {
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-sm">
      {items.map((item, index) => (
        <span
          key={`${item}-${index}`}
          className="flex items-center gap-xs rounded-lg bg-surface-container px-sm py-xs text-body-md text-on-surface"
        >
          <MaterialIcon name={icon} size={18} className="text-outline" />
          {item}
        </span>
      ))}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <ul className="list-disc space-y-1.5 pl-5 text-body-md leading-relaxed text-on-surface-variant">
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  );
}

function RecipeView({ data }: { data: Extract<Payload, { kind: "recipe" }> }) {
  return (
    <>
      <div className="grid grid-cols-1 gap-md md:grid-cols-2">
        <Panel title="Key Ingredients">
          <DotChips
            items={data.ingredients.map((ing) =>
              [ing.quantity, ing.item].filter(Boolean).join(" "),
            )}
          />
        </Panel>
        {data.dietaryTags.length > 0 && (
          <Panel title="Dietary">
            <IconChips items={data.dietaryTags} icon="restaurant_menu" />
          </Panel>
        )}
      </div>

      {data.steps.length > 0 && (
        <Panel title="Steps">
          <ol className="list-decimal space-y-2 pl-5 text-body-md leading-relaxed text-on-surface-variant">
            {data.steps.map((step, index) => (
              <li key={`${index}-${step.slice(0, 24)}`}>{step}</li>
            ))}
          </ol>
        </Panel>
      )}
    </>
  );
}

function ProductView({ data }: { data: Extract<Payload, { kind: "product" }> }) {
  const specs = Object.entries(data.specs);
  return (
    <>
      <div className="grid grid-cols-1 gap-md md:grid-cols-2">
        {data.features.length > 0 && (
          <Panel title="Features">
            <DotChips items={data.features} />
          </Panel>
        )}
        {data.useCases.length > 0 && (
          <Panel title="Use Cases">
            <IconChips items={data.useCases} icon="touch_app" />
          </Panel>
        )}
      </div>

      {specs.length > 0 && (
        <Panel title="Specs">
          <dl className="space-y-1.5 text-body-md">
            {specs.map(([key, value]) => (
              <div key={key} className="flex gap-3">
                <dt className="w-28 shrink-0 text-on-surface-variant">{key}</dt>
                <dd className="text-on-surface">{value}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      )}

      {(data.pros.length > 0 || data.cons.length > 0) && (
        <div className="grid grid-cols-1 gap-md md:grid-cols-2">
          {data.pros.length > 0 && (
            <Panel title="Pros">
              <BulletList items={data.pros} />
            </Panel>
          )}
          {data.cons.length > 0 && (
            <Panel title="Cons">
              <BulletList items={data.cons} />
            </Panel>
          )}
        </div>
      )}
    </>
  );
}

function WorkoutView({ data }: { data: Extract<Payload, { kind: "workout" }> }) {
  return (
    <>
      {data.exercises.length > 0 && (
        <Panel title="Exercises">
          <ul className="space-y-sm">
            {data.exercises.map((exercise) => (
              <li
                key={exercise.name}
                className="rounded-lg bg-surface-container-highest px-md py-sm"
              >
                <p className="text-label-md text-on-surface">{exercise.name}</p>
                <p className="mt-1 text-label-sm font-normal text-on-surface-variant">
                  {[
                    exercise.sets,
                    exercise.difficulty,
                    exercise.targetMuscles.join(", "),
                    exercise.equipment.join(", "),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      <div className="grid grid-cols-1 gap-md md:grid-cols-2">
        {data.benefits.length > 0 && (
          <Panel title="Benefits">
            <BulletList items={data.benefits} />
          </Panel>
        )}
        {data.warnings.length > 0 && (
          <Panel title="Warnings">
            <BulletList items={data.warnings} />
          </Panel>
        )}
      </div>
    </>
  );
}

function TravelView({ data }: { data: Extract<Payload, { kind: "travel" }> }) {
  return (
    <div className="grid grid-cols-1 gap-md md:grid-cols-2">
      {data.destinations.length > 0 && (
        <Panel title="Destinations">
          <IconChips items={data.destinations} icon="flight_takeoff" />
        </Panel>
      )}
      {data.attractions.length > 0 && (
        <Panel title="Attractions">
          <DotChips items={data.attractions} />
        </Panel>
      )}
      {data.hotels.length > 0 && (
        <Panel title="Hotels">
          <IconChips items={data.hotels} icon="business_center" />
        </Panel>
      )}
      {data.restaurants.length > 0 && (
        <Panel title="Restaurants">
          <IconChips items={data.restaurants} icon="restaurant" />
        </Panel>
      )}
      {data.tips.length > 0 && (
        <Panel title="Tips">
          <BulletList items={data.tips} />
        </Panel>
      )}
    </div>
  );
}

function TechView({ data }: { data: Extract<Payload, { kind: "tech" }> }) {
  return (
    <>
      <div className="grid grid-cols-1 gap-md md:grid-cols-2">
        {data.technologies.length > 0 && (
          <Panel title="Technologies">
            <IconChips items={data.technologies} icon="terminal" />
          </Panel>
        )}
        {data.concepts.length > 0 && (
          <Panel title="Concepts">
            <DotChips items={data.concepts} />
          </Panel>
        )}
        {data.libraries.length > 0 && (
          <Panel title="Libraries">
            <IconChips items={data.libraries} icon="code" />
          </Panel>
        )}
        {data.apis.length > 0 && (
          <Panel title="APIs">
            <IconChips items={data.apis} icon="hub" />
          </Panel>
        )}
      </div>

      {data.bestPractices.length > 0 && (
        <Panel title="Best Practices">
          <BulletList items={data.bestPractices} />
        </Panel>
      )}

      {data.codeSnippets.length > 0 && (
        <Panel title="Code">
          <div className="space-y-3">
            {data.codeSnippets.map((snippet, index) => (
              <figure
                key={`${snippet.language}-${index}`}
                className="overflow-hidden rounded-lg border border-outline-variant/40"
              >
                <figcaption className="border-b border-outline-variant/40 bg-surface-container px-3 py-1.5 text-label-sm text-on-surface-variant">
                  {snippet.language}
                  {snippet.note ? ` — ${snippet.note}` : ""}
                </figcaption>
                <pre className="overflow-x-auto bg-surface-container-lowest p-3 text-label-sm font-normal leading-relaxed text-on-surface">
                  <code>{snippet.code}</code>
                </pre>
              </figure>
            ))}
          </div>
        </Panel>
      )}
    </>
  );
}

function GenericView({ data }: { data: Extract<Payload, { kind: "generic" }> }) {
  return (
    <div className="grid grid-cols-1 gap-md md:grid-cols-2">
      {data.facts.length > 0 && (
        <Panel title="Facts">
          <BulletList items={data.facts} />
        </Panel>
      )}
      {data.actionItems.length > 0 && (
        <Panel title="Action Items">
          <BulletList items={data.actionItems} />
        </Panel>
      )}
    </div>
  );
}

export function PayloadRenderer({ value }: { value: unknown }) {
  const parsed = StructuredPayload.safeParse(coerceStructured(value));
  if (!parsed.success) return null;

  const data = parsed.data;
  const hasContent = (() => {
    switch (data.kind) {
      case "recipe":
        return data.ingredients.length + data.steps.length > 0;
      case "product":
        return Boolean(data.productName);
      case "workout":
        return data.exercises.length > 0;
      case "travel":
        return data.destinations.length + data.attractions.length + data.tips.length > 0;
      case "tech":
        return (
          data.technologies.length +
            data.concepts.length +
            data.bestPractices.length +
            data.codeSnippets.length >
          0
        );
      case "generic":
        return data.facts.length + data.actionItems.length > 0;
      default:
        return false;
    }
  })();

  if (!hasContent) return null;

  return (
    <div className="mb-xl space-y-md">
      {data.kind === "recipe" && <RecipeView data={data} />}
      {data.kind === "product" && <ProductView data={data} />}
      {data.kind === "workout" && <WorkoutView data={data} />}
      {data.kind === "travel" && <TravelView data={data} />}
      {data.kind === "tech" && <TechView data={data} />}
      {data.kind === "generic" && <GenericView data={data} />}
    </div>
  );
}

/** Hero stat pairs ("Prep Time / 15m") the design shows under the title. */
export function payloadHighlights(
  value: unknown,
): Array<{ label: string; value: string }> {
  const parsed = StructuredPayload.safeParse(coerceStructured(value));
  if (!parsed.success) return [];
  const data = parsed.data;
  const out: Array<{ label: string; value: string }> = [];

  if (data.kind === "recipe") {
    if (data.totalMinutes != null) {
      out.push({ label: "Total Time", value: `${data.totalMinutes}m` });
    }
    if (data.servings != null) {
      out.push({ label: "Servings", value: String(data.servings) });
    }
    if (data.difficulty) out.push({ label: "Difficulty", value: data.difficulty });
  } else if (data.kind === "product") {
    if (data.brand) out.push({ label: "Brand", value: data.brand });
    if (data.price) {
      out.push({
        label: "Price",
        value: `${data.price.currency} ${data.price.amount}`,
      });
    }
    if (data.rating != null) out.push({ label: "Rating", value: `${data.rating}/5` });
  } else if (data.kind === "workout") {
    if (data.frequency) out.push({ label: "Frequency", value: data.frequency });
    if (data.exercises.length) {
      out.push({ label: "Exercises", value: String(data.exercises.length) });
    }
  } else if (data.kind === "travel") {
    if (data.bestSeason) out.push({ label: "Best Season", value: data.bestSeason });
    if (data.budget) out.push({ label: "Budget", value: data.budget });
  }

  return out.slice(0, 3);
}
