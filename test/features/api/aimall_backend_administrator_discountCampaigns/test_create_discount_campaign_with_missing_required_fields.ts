import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendDiscountCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendDiscountCampaign";

// This test case is omitted because negative test cases requiring intentionally missing required parameters are not possible under TypeScript's strict typing. Validation of required field absence is best implemented in integration tests where compile-time checks can be deliberately bypassed. No E2E test is generated for this scenario.
