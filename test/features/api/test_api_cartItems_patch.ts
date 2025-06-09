import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageICartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICartItem";
import { ICartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ICartItem";

export async function test_api_cartItems_patch(connection: api.IConnection) {
  const output: IPageICartItem = await api.functional.cartItems.patch(
    connection,
    {
      body: typia.random<ICartItem.IRequest>(),
    },
  );
  typia.assert(output);
}
