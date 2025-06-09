import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ICartItem";

export async function test_api_cartItems_putById(connection: api.IConnection) {
  const output: ICartItem = await api.functional.cartItems.putById(connection, {
    id: typia.random<string & tags.Format<"uuid">>(),
    body: typia.random<ICartItem.IUpdate>(),
  });
  typia.assert(output);
}
