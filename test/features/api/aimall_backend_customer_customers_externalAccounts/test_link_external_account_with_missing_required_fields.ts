import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAIMallBackendExternalAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendExternalAccount";

/**
 * [OMITTED] Test for missing required fields in API payload.
 *
 * This E2E runtime test is omitted because the scenario requires submitting
 * payloads that do not conform to the TypeScript DTO/contracts (i.e., omitting
 * required fields). Such invalid payloads cannot be written without bypassing
 * TypeScript's static type checking, which is explicitly forbidden by E2E
 * testing requirements and best practices:
 *
 * - Never use `as any` or bypass type safety in E2E test code
 * - Never test TS compile errors via E2E; only runtime business logic errors are
 *   valid
 *
 * This scenario should be verified via DTO/type contract tests, not E2E API
 * tests. Refer to E2E guidelines: only scenarios representing valid TypeScript
 * DTOs should be implemented as E2E API runtime tests.
 */
export async function test_api_aimall_backend_customer_customers_externalAccounts_test_link_external_account_with_missing_required_fields(
  connection: api.IConnection,
) {
  // [OMITTED] See rationale in JSDoc comments.
}
