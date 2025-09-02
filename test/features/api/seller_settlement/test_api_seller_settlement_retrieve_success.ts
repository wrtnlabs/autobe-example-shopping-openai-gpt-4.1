import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendSellerSettlement } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSellerSettlement";

export async function test_api_seller_settlement_retrieve_success(
  connection: api.IConnection,
) {
  /**
   * E2E test for authenticated seller settlement information retrieval.
   *
   * This test verifies that:
   *
   * 1. A new seller account can be registered.
   * 2. The seller can update their settlement (payout) bank information.
   * 3. The seller can retrieve settlement info, and the returned data matches the
   *    last update.
   *
   * Steps:
   *
   * 1. Register a new seller and extract the sellerId
   * 2. Update the seller's settlement config using their auth context
   * 3. Retrieve the seller's settlement record via the GET endpoint
   * 4. Validate that info (bank name, account number, account holder, memo) are
   *    correct
   */

  // 1. Register a new seller (also authenticates the connection)
  const createInput = {
    email: typia.random<string & tags.Format<"email">>(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAiBackendSeller.ICreate;
  const joinResult = await api.functional.auth.seller.join(connection, {
    body: createInput,
  });
  typia.assert(joinResult);
  const sellerId = joinResult.seller.id;

  // 2. Update seller settlement info with realistic data
  const updateBody = {
    bank_name: RandomGenerator.name(2),
    bank_account_number: RandomGenerator.alphaNumeric(14),
    account_holder: RandomGenerator.name(1),
    remittance_memo: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallAiBackendSellerSettlement.IUpdate;
  const updateResult =
    await api.functional.shoppingMallAiBackend.seller.sellers.settlement.update(
      connection,
      {
        sellerId,
        body: updateBody,
      },
    );
  typia.assert(updateResult);
  TestValidator.equals(
    "updated settlement matches input",
    updateResult.bank_name,
    updateBody.bank_name,
  );
  TestValidator.equals(
    "updated bank account matches input",
    updateResult.bank_account_number,
    updateBody.bank_account_number,
  );
  TestValidator.equals(
    "updated account holder matches input",
    updateResult.account_holder,
    updateBody.account_holder,
  );
  TestValidator.equals(
    "updated remittance memo matches input",
    updateResult.remittance_memo,
    updateBody.remittance_memo,
  );

  // 3. GET settlement info and validate returned data matches update
  const settlement =
    await api.functional.shoppingMallAiBackend.seller.sellers.settlement.at(
      connection,
      {
        sellerId,
      },
    );
  typia.assert(settlement);
  TestValidator.equals(
    "retrieved settlement matches update (bank name)",
    settlement.bank_name,
    updateBody.bank_name,
  );
  TestValidator.equals(
    "retrieved settlement matches update (bank account)",
    settlement.bank_account_number,
    updateBody.bank_account_number,
  );
  TestValidator.equals(
    "retrieved settlement matches update (account holder)",
    settlement.account_holder,
    updateBody.account_holder,
  );
  TestValidator.equals(
    "retrieved settlement matches update (remittance memo)",
    settlement.remittance_memo,
    updateBody.remittance_memo,
  );
}
