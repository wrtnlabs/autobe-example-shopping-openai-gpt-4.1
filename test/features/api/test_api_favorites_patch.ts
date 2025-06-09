import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFavorite";
import { IFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IFavorite";

export async function test_api_favorites_patch(connection: api.IConnection) {
  const output: IPageIFavorite = await api.functional.favorites.patch(
    connection,
    {
      body: typia.random<IFavorite.IRequest>(),
    },
  );
  typia.assert(output);
}
