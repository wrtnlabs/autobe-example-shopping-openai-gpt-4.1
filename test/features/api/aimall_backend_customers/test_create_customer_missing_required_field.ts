import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";

// The required field validation scenario cannot be implemented as a type-safe E2E test.
// Per system requirements, E2E tests must never bypass TypeScript type safety or use `as any`/type suppression.
// Omitting required fields such as 'email' or 'phone' would cause TypeScript compilation errors, not runtime errors.
// Therefore, this test scenario is skipped.
