import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ICartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ICartItem";

export async function test_api_cartItems_post(connection: api.IConnection) {
  const output: ICartItem = await api.functional.cartItems.post(connection, {
    body: typia.random<ICartItem.ICreate>(),
  });
  typia.assert(output);
}
