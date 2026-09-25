import { defineCatalog, defineSchema } from "@json-render/core";
import { z } from "zod";

/**
 * The flat-spec schema that @json-render/react exports from its `/schema`
 * entry point, reproduced here verbatim. That package is pure data (no React
 * code runs in it), but it declares a React peer dependency, and a Worker has
 * no business bundling React. Copying the schema keeps the Worker's dependency
 * list to @json-render/core, @typesafe-ai/sdk, and zod.
 *
 * Keep this in sync with @json-render/react 0.21.0 if the pin ever moves.
 */
const schema = defineSchema(
  (s) => ({
    // What the AI-generated SPEC looks like
    spec: s.object({
      /** Root element key */
      root: s.string(),
      /** Flat map of elements by key */
      elements: s.record(
        s.object({
          /** Component type from catalog */
          type: s.ref("catalog.components"),
          /** Component props */
          props: s.propsOf("catalog.components"),
          /** Child element keys (flat reference) */
          children: s.array(s.string()),
          slots: { ...s.record(s.array(s.string())), ...s.optional() },
          /** Visibility condition */
          visible: { ...s.any(), ...s.optional() },
          /** Repeat children from a state array */
          repeat: { ...s.any(), ...s.optional() },
        }),
      ),
    }),
    // What the CATALOG must provide
    catalog: s.object({
      /** Component definitions */
      components: s.map({
        /** Zod schema for component props */
        props: s.zod(),
        /** Slots for this component. Use ['default'] for children, or named slots like ['header', 'footer'] */
        slots: s.array(s.string()),
        /** Description for AI generation hints */
        description: s.string(),
        /** Example prop values used in prompt examples (auto-generated from Zod schema if omitted) */
        example: s.any(),
      }),
      /** Action definitions (optional) */
      actions: s.map({
        /** Zod schema for action params */
        params: s.zod(),
        /** Description for AI generation hints */
        description: s.string(),
      }),
    }),
  }),
  {
    builtInActions: [
      {
        name: "setState",
        description:
          "Update a value in the state model at the given statePath. Params: { statePath: string, value: any }",
      },
      {
        name: "pushState",
        description:
          'Append an item to an array in state. Params: { statePath: string, value: any, clearStatePath?: string }. Value can contain {"$state":"/path"} refs and "$id" for auto IDs.',
      },
      {
        name: "removeState",
        description:
          "Remove an item from an array in state by index. Params: { statePath: string, index: number }",
      },
      {
        name: "validateForm",
        description:
          "Validate all registered form fields and write the result to state. Params: { statePath?: string }. Defaults to /formValidation. Result: { valid: boolean, errors: Record<string, string[]> }.",
      },
    ],
    defaultRules: [
      // Element integrity
      "CRITICAL INTEGRITY CHECK: Before outputting ANY element that references children, you MUST have already output (or will output) each child as its own element. If an element has children: ['a', 'b'], then elements 'a' and 'b' MUST exist. A missing child element causes that entire branch of the UI to be invisible.",
      "SELF-CHECK: After generating all elements, mentally walk the tree from root. Every key in every children array must resolve to a defined element. If you find a gap, output the missing element immediately.",
      'REQUIRED FIELDS: Every element MUST include a "children" array. Leaf elements (text, badges, inputs, images) use an empty array: "children": []. Omitting "children" fails validation.',
      'NAMED SLOTS: Use "children" for the default slot. For other slots declared by the component, use a top-level "slots" object that maps each slot name to child element keys, for example {"slots":{"header":["heading"],"footer":["actions"]}}. Never use "slots.default". Every referenced key must exist.',
      'FILTERED LISTS: To render only the items matching a field value (kanban columns, tabbed lists, status sections), put "repeat" and a "visible" condition with $item on the same container element: {"repeat": {"statePath": "/tasks", "key": "id"}, "visible": {"$item": "status", "eq": "todo"}} renders one child per matching item. A visible condition object must use exactly one of $state, $item, or $index \u2014 never combine them in one object.',
      // Field placement
      'CRITICAL: The "visible" field goes on the ELEMENT object, NOT inside "props". Correct: {"type":"<ComponentName>","props":{},"visible":{"$state":"/tab","eq":"home"},"children":[...]}.',
      'CRITICAL: The "on" field goes on the ELEMENT object, NOT inside "props". Use on.press, on.change, on.submit etc. NEVER put action/actionParams inside props.',
      // State and data
      "When the user asks for a UI that displays data (e.g. blog posts, products, users), ALWAYS include a state field with realistic sample data. The state field is a top-level field on the spec (sibling of root/elements).",
      'When building repeating content backed by a state array (e.g. posts, products, items), use the "repeat" field on a container element. Example: { "type": "<ContainerComponent>", "props": {}, "repeat": { "statePath": "/posts", "key": "id" }, "children": ["post-card"] }. For a nested list stored on the enclosing item, use "repeat": { "statePath": { "$item": "comments" }, "key": "id" }. The $item statePath form is valid only inside another repeat. Replace <ContainerComponent> with an appropriate component from the AVAILABLE COMPONENTS list. Inside repeated children, use { "$item": "field" } to read a field from the current item, and { "$index": true } for the current array index. For two-way binding to an item field use { "$bindItem": "completed" }. Do NOT hardcode individual elements for each array item.',
      // Design quality
      "Design with visual hierarchy: use container components to group content, heading components for section titles, proper spacing, and status indicators. ONLY use components from the AVAILABLE COMPONENTS list.",
      "For data-rich UIs, use multi-column layout components if available. For forms and single-column content, use vertical layout components. ONLY use components from the AVAILABLE COMPONENTS list.",
      "Always include realistic, professional-looking sample data. For blogs include 3-4 posts with varied titles, authors, dates, categories. For products include names, prices, images. Never leave data empty.",
    ],
  },
);

// Every prop value below is site content prepared in code. Jev never writes a
// prop; it only picks which of these elements appear, and where.
const link = z.object({ label: z.string(), href: z.string() });

export const catalog = defineCatalog(schema, {
  components: {
    Page: {
      props: z.object({}),
      slots: ["default"],
      description: "Outermost vertical page container.",
    },
    Section: {
      props: z.object({ title: z.string(), eyebrow: z.string().nullable() }),
      slots: ["default"],
      description: "Titled section grouping related content.",
    },
    Row: {
      props: z.object({ columns: z.union([z.literal(2), z.literal(3)]) }),
      slots: ["default"],
      description: "Side-by-side columns.",
    },
    Hero: {
      props: z.object({
        name: z.string(),
        tagline: z.string(),
        subline: z.string().nullable(),
      }),
      description: "Name and tagline header.",
    },
    Text: {
      props: z.object({
        text: z.string(),
        variant: z.enum(["lead", "body", "muted"]),
      }),
      description: "Paragraph of prepared text.",
    },
    StatStrip: {
      props: z.object({
        stats: z.array(z.object({ label: z.string(), value: z.string() })),
        caption: z.string().nullable(),
      }),
      description: "Row of numeric stats.",
    },
    SkillTags: {
      props: z.object({ skills: z.array(z.string()), url: z.string().nullable() }),
      description: "Tag cloud of skills.",
    },
    RoleCard: {
      props: z.object({
        company: z.string(),
        title: z.string(),
        period: z.string(),
        location: z.string().nullable(),
        achievements: z.array(z.string()),
        url: z.string().nullable(),
      }),
      events: ["press"],
      description: "One job role with achievements.",
    },
    ProjectCard: {
      props: z.object({
        name: z.string(),
        summary: z.string(),
        tags: z.array(z.string()),
        kind: z.string().nullable(),
        url: z.string().nullable(),
      }),
      events: ["press"],
      description: "One project or product.",
    },
    PostCard: {
      props: z.object({
        title: z.string(),
        summary: z.string(),
        date: z.string(),
        url: z.string(),
      }),
      events: ["press"],
      description: "One blog post.",
    },
    EducationList: {
      props: z.object({
        items: z.array(
          z.object({
            institution: z.string(),
            degree: z.string(),
            honors: z.string().nullable(),
          }),
        ),
        url: z.string().nullable(),
      }),
      description: "Degrees and honors.",
    },
    LinkRow: {
      props: z.object({ links: z.array(link) }),
      description: "Row of external links.",
    },
    ContactCTA: {
      props: z.object({
        heading: z.string(),
        text: z.string(),
        buttonLabel: z.string(),
        url: z.string().nullable(),
      }),
      events: ["press"],
      description: "Call to action with one button.",
    },
    FitAnalysis: {
      props: z.object({ heading: z.string(), placeholder: z.string() }),
      description: "Job description box that returns a fit assessment.",
    },
    GameTeaser: {
      props: z.object({ title: z.string(), text: z.string(), url: z.string().nullable() }),
      events: ["press"],
      description: "Teaser card for the Jev-built scroller.",
    },
  },
  actions: {
    navigate: {
      params: z.object({ url: z.string() }),
      description: "Open a URL.",
    },
  },
});

export type Catalog = typeof catalog;
