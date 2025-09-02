import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCodebook } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCodebook";

/**
 * Validate that codebook creation is rejected for unauthenticated
 * (non-admin) requests.
 *
 * This test checks that the business dictionary codebook creation API is
 * properly protected and cannot be used without admin authentication. The
 * scenario mimics an attempt by a non-logged-in or unauthorized user to
 * POST creation of a codebook. The test passes only if the system rejects
 * the request with an authentication or authorization error, such as 401
 * Unauthorized or 403 Forbidden.
 *
 * Steps:
 *
 * 1. Prepare an unauthenticated connection with no Authorization header.
 * 2. Build a random, valid codebook creation request.
 * 3. Attempt to create a codebook via the admin API.
 * 4. Assert that the operation fails due to authentication.
 */
export async function test_api_admin_codebook_creation_unauthenticated(
  connection: api.IConnection,
) {
  // 1. Prepare an unauthenticated connection (remove Authorization header if present)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2. Create valid codebook creation input
  const input: IShoppingMallAiBackendCodebook.ICreate = {
    code: RandomGenerator.alphabets(8),
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 4,
      wordMax: 9,
    }),
  };

  // 3. Expect API call to throw error when unauthorized
  await TestValidator.error(
    "unauthenticated user cannot create codebook",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.codebooks.create(
        unauthConn,
        { body: input },
      );
    },
  );
}
