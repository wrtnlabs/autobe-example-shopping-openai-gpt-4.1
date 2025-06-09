import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IFavorite";

export async function test_api_favorites_post(connection: api.IConnection) {
  const output: IFavorite = await api.functional.favorites.post(connection, {
    body: typia.random<IFavorite.ICreate>(),
  });
  typia.assert(output);
}
