import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendSellerSettlement } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSellerSettlement";

export async function test_api_seller_settlement_update_success(
  connection: api.IConnection,
) {
  /**
   * Validates the complete, successful update of a seller's settlement (payout)
   * details.
   *
   * This test covers the main happy-path scenario for updating sensitive seller
   * payout info:
   *
   * 1. Register a new seller with fully valid business credentials.
   * 2. As the authenticated seller, update their settlement details (bank info,
   *    account holder, remittance memo).
   * 3. Assert that all updated fields are reflected and match the submitted update
   *    values.
   *
   * Steps:
   *
   * 1. Create (register) a new seller for authentication context.
   * 2. Update settlement information for the authenticated seller, providing both
   *    required and optional fields.
   * 3. Assert all updated fields and settlement record structure are correct.
   */
  // 1. Seller registration/authentication
  const sellerInput: IShoppingMallAiBackendSeller.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 2 }),
  };
  const authResult: IShoppingMallAiBackendSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerInput });
  typia.assert(authResult);

  // Extract and strictly validate the seller id
  const sellerId = typia.assert<string & tags.Format<"uuid">>(
    authResult.seller.id,
  );

  // 2. Seller updates payout/settlement configuration
  const updateInput: IShoppingMallAiBackendSellerSettlement.IUpdate = {
    bank_name: RandomGenerator.name(2),
    bank_account_number: RandomGenerator.alphaNumeric(14),
    account_holder: RandomGenerator.name(2),
    remittance_memo: RandomGenerator.paragraph({ sentences: 4 }),
  };

  const updatedSettlement: IShoppingMallAiBackendSellerSettlement =
    await api.functional.shoppingMallAiBackend.seller.sellers.settlement.update(
      connection,
      {
        sellerId: sellerId,
        body: updateInput,
      },
    );
  typia.assert(updatedSettlement);

  // 3. Verify that the updated fields are persisted correctly
  TestValidator.equals(
    "bank_name should be updated",
    updatedSettlement.bank_name,
    updateInput.bank_name,
  );
  TestValidator.equals(
    "bank_account_number should be updated",
    updatedSettlement.bank_account_number,
    updateInput.bank_account_number,
  );
  TestValidator.equals(
    "account_holder should be updated",
    updatedSettlement.account_holder,
    updateInput.account_holder,
  );
  TestValidator.equals(
    "remittance_memo should be updated",
    updatedSettlement.remittance_memo,
    updateInput.remittance_memo,
  );

  // 4. Confirm that structural fields are valid and seller_id linkage is correct
  TestValidator.equals(
    "settlement.seller_id should match authenticated seller",
    updatedSettlement.seller_id,
    sellerId,
  );
  typia.assert<string & tags.Format<"uuid">>(updatedSettlement.id);
  typia.assert<string & tags.Format<"date-time">>(updatedSettlement.created_at);
  typia.assert<string & tags.Format<"date-time">>(updatedSettlement.updated_at);
}
