import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IFavorite";

export async function test_api_favorites_eraseById(
  connection: api.IConnection,
) {
  const output: IFavorite = await api.functional.favorites.eraseById(
    connection,
    {
      id: typia.random<string>(),
    },
  );
  typia.assert(output);
}
