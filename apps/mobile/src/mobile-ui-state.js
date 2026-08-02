import { createHomeViewModel } from './home-view-model.js';

export function createDemoHomeState() {
  return createHomeViewModel({
    profile: { displayName: 'друг' },
    habits: [{ id: 'walk', name: '10 минут прогулки', completedToday: false, streak: 0 }],
    goals: [],
    recommendation: 'Поделись одной мыслью — я помогу её структурировать.',
  });
}
