// Shared components
export { default as GlassCard } from './components/GlassCard';
export { default as PremiumButton } from './components/PremiumButton';
export { default as Breadcrumb } from './components/Breadcrumb';
export { default as UnifiedSidebar } from './components/UnifiedSidebar';

// Context
export { AuthProvider, useAuth } from './context/AuthContext';

// Hooks
export { useNavigation } from './hooks/useNavigation';
export { useWorkshopProgress } from './workshops/hooks/useWorkshopProgress';

// Lib utilities
export * from './lib/utils';
export * from './lib/formatting';
export * from './lib/validation';

// Middleware
export { createRoleGuard } from './middleware/roleGuard';

// Types
export type { User, UserRole } from './types/user';
export type { Workshop, ExerciseStep } from './workshops/types/workshop';

// Workshop components
export { default as WorkshopLayout } from './workshops/components/WorkshopLayout';
export { workshops } from './workshops/data/workshops';
