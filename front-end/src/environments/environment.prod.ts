import { environment as defaultEnv } from './environment.idea';

// @idea note well: "environment.prod.ts" !== "AWS prod". Explanation:
// When developing locally (no matter the scenario), the default environment file is used (`environment.ts`).
// This file is used when the app is deployed to the cloud, no matter if in the "dev" or "prod" AWS environment.
export const environment = Object.assign({}, defaultEnv, {
  debug: false
});
