import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ICartItem";

export async function test_api_cartItems_getById(connection: api.IConnection) {
  const output: ICartItem = await api.functional.cartItems.getById(connection, {
    id: typia.random<string & tags.Format<"uuid">>(),
  });
  typia.assert(output);
}
