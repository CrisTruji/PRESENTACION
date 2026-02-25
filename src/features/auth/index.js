// ========================================
// PUBLIC API - Auth Feature
// ========================================

// Context & Hook
export { AuthProvider, useAuth } from './context/AuthContext';

// Screens
export { default as LoginScreen } from './components/LoginScreen';
export { default as RegisterScreen } from './components/RegisterScreen';
export { default as WaitingRoleScreen } from './components/WaitingRoleScreen';

// Services
export {
  getPendingUsers,
  getAllRoles,
  assignRole,
  rejectUser,
  getUserStats,
  getPendingUsersByRol,
  getActiveUsers,
  updateUserProfile,
  deactivateUser,
  deleteUser,
} from './services/profilesService';

// Lib
export { listRoles } from './lib/roles';
export { permissions, canRolePerform } from './lib/permissions';

// Utils
export { forceAuthReset } from './utils/authreset';
