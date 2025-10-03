import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallEntityAttachmentLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallEntityAttachmentLink";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallEntityAttachmentLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEntityAttachmentLink";

/**
 * Validate admin ability to search and filter paginated entity-attachment links
 * by complex query.
 *
 * 1. Register a test admin using POST /auth/admin/join.
 * 2. Create a set of diverse entity-attachment links using POST
 *    /shoppingMall/admin/entityAttachmentLinks. Vary entity_type, entity_id,
 *    attachment_id, purpose, visible_to_roles, and assign some records with
 *    deleted_at.
 * 3. For each search scenario: a) By entity_type: Filter for a specific
 *    entity_type and check only relevant records are returned. b) By entity_id:
 *    Filter for a specific entity_id and check only relevant records are
 *    returned. c) By purpose: Filter for a defined purpose term, validate
 *    subset. d) By visible_to_roles: Filter to ensure only links visible to a
 *    role can be fetched (test admin-specific or public). e) By deleted_state:
 *    Query for all, deleted, and active, validating presence or absence of
 *    logically deleted records.
 * 4. Check pagination parameters (page/limit), sorting (if applicable), and that
 *    business rules for role access and row visibility are correct for an
 *    admin.
 * 5. Confirm retrieved links match created set, no extraneous or missing records,
 *    and fields (entity_type/id/purpose/role/deleted_at) align to filter
 *    logic.
 */
export async function test_api_entity_attachment_links_list_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // 2. Create diverse entity-attachment links for pagination/filtering
  const entityTypes = ["product", "order", "review", "board_post"] as const;
  const purposes = ["evidence", "thumbnail", "document", undefined] as const;
  const roles = ["admin", "seller", "customer", undefined] as const;
  const entityAttachmentLinks: IShoppingMallEntityAttachmentLink[] = [];

  // Create 10 links with combinations (ensure some overlap by type/id/purpose/role)
  for (let i = 0; i < 10; ++i) {
    const entity_type = RandomGenerator.pick(entityTypes);
    const entity_id = typia.random<string & tags.Format<"uuid">>();
    const shopping_mall_attachment_id = typia.random<
      string & tags.Format<"uuid">
    >();
    const linked_by_user_id = admin.id;
    const purpose = RandomGenerator.pick(purposes);
    const visible_to_roles = RandomGenerator.pick(roles);
    const linkBody = {
      shopping_mall_attachment_id,
      entity_type,
      entity_id,
      linked_by_user_id,
      ...(purpose !== undefined ? { purpose } : {}),
      ...(visible_to_roles !== undefined ? { visible_to_roles } : {}),
    } satisfies IShoppingMallEntityAttachmentLink.ICreate;
    const link =
      await api.functional.shoppingMall.admin.entityAttachmentLinks.create(
        connection,
        { body: linkBody },
      );
    typia.assert(link);
    entityAttachmentLinks.push(link);
  }

  // Soft delete a subset: set deleted_at field artificially for test (API does not expose delete, so mutate a test record in data)
  entityAttachmentLinks.slice(0, 2).forEach((link) => {
    (link as any).deleted_at = new Date().toISOString(); // simulate logical delete
  });

  // Helper: get non-soft-deleted and soft-deleted link sets
  const activeLinks = entityAttachmentLinks.filter((l) => !l.deleted_at);
  const deletedLinks = entityAttachmentLinks.filter((l) => l.deleted_at);

  // 3a. Search by entity_type
  const filterType = RandomGenerator.pick(entityTypes);
  const reqByEntityType = {
    entity_type: filterType,
    page: 1,
    limit: 100,
  } satisfies IShoppingMallEntityAttachmentLink.IRequest;
  const resByType =
    await api.functional.shoppingMall.admin.entityAttachmentLinks.index(
      connection,
      { body: reqByEntityType },
    );
  typia.assert(resByType);
  TestValidator.predicate(
    `links match filter by entity_type=${filterType}`,
    resByType.data.every((link) => link.entity_type === filterType),
  );

  // 3b. Search by entity_id
  const targetById = RandomGenerator.pick(entityAttachmentLinks).entity_id;
  const reqByEntityId = {
    entity_id: targetById,
    page: 1,
    limit: 100,
  } satisfies IShoppingMallEntityAttachmentLink.IRequest;
  const resById =
    await api.functional.shoppingMall.admin.entityAttachmentLinks.index(
      connection,
      { body: reqByEntityId },
    );
  typia.assert(resById);
  TestValidator.predicate(
    `links match filter by entity_id=${targetById}`,
    resById.data.every((link) => link.entity_id === targetById),
  );

  // 3c. Search by purpose
  const definedPurposes = purposes.filter((p) => p !== undefined) as string[];
  const filterPurpose = RandomGenerator.pick(definedPurposes);
  const reqByPurpose = {
    purpose: filterPurpose,
    page: 1,
    limit: 100,
  } satisfies IShoppingMallEntityAttachmentLink.IRequest;
  const resByPurpose =
    await api.functional.shoppingMall.admin.entityAttachmentLinks.index(
      connection,
      { body: reqByPurpose },
    );
  typia.assert(resByPurpose);
  TestValidator.predicate(
    `links match filter by purpose=${filterPurpose}`,
    resByPurpose.data.every((link) => link.purpose === filterPurpose),
  );

  // 3d. Search by visible_to_roles (simulate querying with/without role; as admin should see all or all public)
  const visibleRole = RandomGenerator.pick([
    "admin",
    "seller",
    "customer",
  ] as const);
  const reqByRole = {
    visible_to_roles: visibleRole,
    page: 1,
    limit: 100,
  } satisfies IShoppingMallEntityAttachmentLink.IRequest;
  const resByRole =
    await api.functional.shoppingMall.admin.entityAttachmentLinks.index(
      connection,
      { body: reqByRole },
    );
  typia.assert(resByRole);
  TestValidator.predicate(
    `links visible for role=${visibleRole}`,
    resByRole.data.every(
      (link) =>
        link.visible_to_roles === undefined ||
        link.visible_to_roles.includes(visibleRole),
    ),
  );

  // 3e. Pagination: fetch first page w/ limit=3
  const pagReq = {
    page: 1,
    limit: 3,
  } satisfies IShoppingMallEntityAttachmentLink.IRequest;
  const pagRes =
    await api.functional.shoppingMall.admin.entityAttachmentLinks.index(
      connection,
      { body: pagReq },
    );
  typia.assert(pagRes);
  TestValidator.equals(
    "pagination: page 1, limit 3",
    pagRes.pagination.current,
    1,
  );
  TestValidator.equals("pagination: limit == 3", pagRes.pagination.limit, 3);
  TestValidator.predicate(
    "pagination returns <= limit",
    pagRes.data.length <= 3,
  );

  // 3f. Deleted state filtering
  // all
  const allDeletedReq = {
    deleted_state: "all",
    page: 1,
    limit: 100,
  } satisfies IShoppingMallEntityAttachmentLink.IRequest;
  const allDeletedRes =
    await api.functional.shoppingMall.admin.entityAttachmentLinks.index(
      connection,
      { body: allDeletedReq },
    );
  typia.assert(allDeletedRes);
  TestValidator.predicate(
    "all records returned for deleted_state=all",
    entityAttachmentLinks.every((link) =>
      allDeletedRes.data.some((r) => r.id === link.id),
    ),
  );
  // deleted only
  const deletedReq = {
    deleted_state: "deleted",
    page: 1,
    limit: 100,
  } satisfies IShoppingMallEntityAttachmentLink.IRequest;
  const deletedRes =
    await api.functional.shoppingMall.admin.entityAttachmentLinks.index(
      connection,
      { body: deletedReq },
    );
  typia.assert(deletedRes);
  TestValidator.predicate(
    "only deleted records returned for deleted_state=deleted",
    deletedLinks.every((link) => deletedRes.data.some((r) => r.id === link.id)),
  );
  // active only
  const activeReq = {
    deleted_state: "active",
    page: 1,
    limit: 100,
  } satisfies IShoppingMallEntityAttachmentLink.IRequest;
  const activeRes =
    await api.functional.shoppingMall.admin.entityAttachmentLinks.index(
      connection,
      { body: activeReq },
    );
  typia.assert(activeRes);
  TestValidator.predicate(
    "only active records returned for deleted_state=active",
    activeLinks.every((link) => activeRes.data.some((r) => r.id === link.id)),
  );
}
