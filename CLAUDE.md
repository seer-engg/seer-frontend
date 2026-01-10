# Seer Frontend - Project Memory

## Project Overview

Seer is a workflow automation and AI agent platform with a React-based frontend for building, testing, and monitoring AI workflows.

## Tech Stack

- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS with custom design system
- **Component Library:** shadcn/ui (Radix UI primitives)
- **State Management:** React Query (TanStack Query)
- **Routing:** React Router v6
- **UI Patterns:** Class Variance Authority (CVA) for component variants
- **Authentication:** Clerk
- **Backend:** Supabase
- **Workflow Engine:** React Flow (@xyflow/react)

## Project Structure

```
src/
├── components/
│   ├── ui/              # Base UI components (shadcn/ui)
│   ├── workflows/       # Workflow builder components
│   └── ...              # Feature-specific components
├── pages/               # Route pages
├── lib/                 # Utilities and helpers
├── hooks/               # Custom React hooks
└── index.css           # Design system and global styles
```

## Design System

### Color Palette

Seer uses a custom "Hacker Dark Mode" design system with these semantic colors:

- **seer** (`239 84% 67%`): Purple brand color for primary branding
- **bug** (`347 77% 50%`): Red for errors and bug indicators
- **success** (`160 84% 39%`): Emerald green for success states and ready indicators
- **warning** (`38 92% 50%`): Amber orange for warnings and attention states
- **destructive** (`0 84% 60%`): Red for dangerous actions

Reference: `src/index.css` lines 10-121

### Custom Utilities

- `text-gradient-seer`: Purple gradient text effect
- `glow-seer`, `glow-success`, `glow-bug`: Glow effects with 20px blur at 0.3 opacity
- `scrollbar-thin`: Custom thin scrollbars
- `shadow-inner-right/left`: Subtle inner shadows for depth

Reference: `src/index.css` lines 138-194

## Component Guidelines

All UI components follow consistent patterns documented in `.claude/rules/`:

1. **Component Design** (`.claude/rules/component-design.md`):
   - Badge/pill styling patterns
   - Button variants and sizing
   - Form input patterns
   - Component structure requirements

2. **Color/Theming** (`.claude/rules/color-theming.md`):
   - When to use specific colors
   - Transparency conventions
   - Dark mode support

3. **TypeScript Patterns** (`.claude/rules/typescript-patterns.md`):
   - Component props patterns
   - Export conventions
   - Type safety requirements

4. **State Management** (`.claude/rules/state-management.md`):
   - Zustand store vs local state decisions
   - Existing stores reference
   - Refactoring patterns

### Key Component Patterns

**Badge Components:**
- Prefer minimal design without icons for labels and counts
- Use subtle backgrounds: `bg-emerald-500/10 text-emerald-600 border-emerald-500/20`
- Reserve icon-based badges for critical status indicators only
- Reference: `src/components/workflows/build/CategoryBadge.tsx`

**Button Components:**
- Use CVA-based variants: default, destructive, outline, secondary, ghost, link, brand
- Always use `asChild` prop when wrapping other components
- Reference: `src/components/ui/button.tsx`

**Input Components:**
- Maintain consistent height (`h-10`), padding (`px-3 py-2`)
- Include proper focus states and accessibility
- Reference: `src/components/ui/input.tsx`

## Common Commands

```bash
# Development
npm run dev              # Start dev server on http://localhost:5173

# Build
npm run build           # Production build
npm run build:dev       # Development build

# Linting
npm run lint            # Run ESLint
npm run lint -- --fix   # Auto-fix linting issues

# Preview
npm run preview         # Preview production build
```

## Dark Mode Support

All components MUST support both light and dark modes:
- Use CSS variables from `:root` and `.dark` (defined in `src/index.css`)
- Test all UI changes in both themes before finalizing
- Apply dark mode variants using Tailwind's `dark:` prefix

## Workflow Components

The workflow builder uses React Flow for visual workflow creation:

- Block nodes: LLM, If/Else, For Loop, Trigger
- Tool integrations: GitHub, Gmail, webhooks, custom tools
- State management: Zustand stores (canvas, workflow, tools, triggers)
- Reference: `src/components/workflows/`

## Code Style

- Use TypeScript strict mode (already enabled)
- Prefer named exports over default exports
- Use `cn()` utility from `@/lib/utils` for class merging
- Follow existing component patterns in `src/components/ui/`

## Getting Started

When working on this project:

1. Check existing components in `src/components/ui/` before creating new ones
2. Follow the design system colors and utilities defined in `src/index.css`
3. Reference `.claude/rules/` for detailed component patterns
4. Ensure dark mode support for all UI changes
5. Run `npm run lint -- --fix` to format code

## Additional Resources

- Component patterns: See `.claude/rules/component-design.md`
- Color system: See `.claude/rules/color-theming.md`
- TypeScript patterns: See `.claude/rules/typescript-patterns.md`
- State management: See `.claude/rules/state-management.md`
- Auto-applied patterns: See `.claude/skills/seer-ui-components/SKILL.md`

## Decision Tree: Where Should a Type Live?
Is the type used in 3+ components across different subdirectories?
  ├─ YES → Place in root-level types.ts or buildtypes.ts
  └─ NO → Is it used in 2+ files within same subdirectory?
      ├─ YES → Place in subdirectory-level types.ts
      └─ NO → Keep in component file where it's used
