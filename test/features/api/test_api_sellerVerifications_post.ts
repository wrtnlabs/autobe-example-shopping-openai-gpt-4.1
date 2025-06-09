import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ISellerVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ISellerVerification";

export async function test_api_sellerVerifications_post(
  connection: api.IConnection,
) {
  const output: ISellerVerification =
    await api.functional.sellerVerifications.post(connection, {
      body: typia.random<ISellerVerification.ICreate>(),
    });
  typia.assert(output);
}
