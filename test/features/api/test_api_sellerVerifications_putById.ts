import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ISellerVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ISellerVerification";

export async function test_api_sellerVerifications_putById(
  connection: api.IConnection,
) {
  const output: ISellerVerification =
    await api.functional.sellerVerifications.putById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<ISellerVerification.IUpdate>(),
    });
  typia.assert(output);
}
