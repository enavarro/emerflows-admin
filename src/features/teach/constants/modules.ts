import type { ModuleDef, ModuleType } from '../api/types';

export type { ModuleDef, ModuleType };

// 12-module catalog mirroring teacher-admin/teacher-data.js MODULES (COD-03).
// Order is significant — consumers iterate this array to build the cohort
// progress matrix (one column per module, in module-num order).
//
// Prototype IDs `m01..m12` are normalised to the production schema convention
// `module-01..module-12` (matching submissions.module_id and the recordings
// storage path `recordings/<cohort>/<learner-uuid>/module-XX-attempt-N.webm`).
// Prototype types `speak` and `convo` map to ModuleType `recording` and
// `conversation` respectively (the wire-format names used in submissions.type).
export const MODULES: readonly ModuleDef[] = [
  { id: 'module-01', num: 1, title: 'Self-Introduction', types: ['recording', 'conversation'] },
  { id: 'module-02', num: 2, title: 'Work & Responsibilities', types: ['recording'] },
  { id: 'module-03', num: 3, title: 'Describing a Project', types: ['conversation'] },
  { id: 'module-04', num: 4, title: 'Meetings & Small Talk', types: ['recording', 'conversation'] },
  { id: 'module-05', num: 5, title: 'Giving Feedback', types: ['conversation'] },
  { id: 'module-06', num: 6, title: 'Presenting Data', types: ['recording'] },
  { id: 'module-07', num: 7, title: 'Negotiation Basics', types: ['recording', 'conversation'] },
  { id: 'module-08', num: 8, title: 'Client Calls', types: ['conversation'] },
  { id: 'module-09', num: 9, title: 'Storytelling at Work', types: ['recording'] },
  { id: 'module-10', num: 10, title: 'Difficult Conversations', types: ['conversation'] },
  { id: 'module-11', num: 11, title: 'Interview Practice', types: ['recording', 'conversation'] },
  { id: 'module-12', num: 12, title: 'Reflections & Goals', types: ['recording'] }
] as const;

export function getModule(moduleId: string): ModuleDef | undefined {
  return MODULES.find((m) => m.id === moduleId);
}
