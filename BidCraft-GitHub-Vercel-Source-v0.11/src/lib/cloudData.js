import { initialData, newProject, trades as defaultTrades } from "../data/seed";
import {
  deleteRows,
  insertRows,
  rpc,
  selectRows,
  updateRows,
  upsertRows,
} from "./supabaseApi";

const clone = (value) => JSON.parse(JSON.stringify(value));

function cleanCompanySettings(settings, fallbackName) {
  const safe = settings && typeof settings === "object" ? settings : {};
  return {
    company: {
      ...clone(initialData.company),
      ...(safe.company || {}),
      name: safe.company?.name || fallbackName || initialData.company.name,
    },
    trades: Array.isArray(safe.trades) ? safe.trades : defaultTrades,
  };
}

export function rowToProject(row) {
  return {
    ...newProject(1),
    ...(row.payload || {}),
    id: row.id,
    name: row.name || row.payload?.name || "Untitled project",
    client: row.client || row.payload?.client || "",
    status: row.status || row.payload?.status || "Draft",
    proposalNumber:
      row.proposal_number || row.payload?.proposalNumber || "BC-000",
  };
}

export function projectToRow(project, companyId, userId) {
  return {
    id: project.id,
    company_id: companyId,
    name: project.name || "Untitled project",
    client: project.client || "",
    status: project.status || "Draft",
    proposal_number: project.proposalNumber || "",
    payload: project,
    updated_by: userId,
    created_by: userId,
  };
}

export function rowToPriceBookItem(row) {
  return {
    ...(row.payload || {}),
    id: row.id,
    item: row.item || row.payload?.item || "Untitled item",
    trade: row.trade || row.payload?.trade || "General Conditions",
  };
}

export function priceBookItemToRow(item, companyId, userId) {
  return {
    id: item.id,
    company_id: companyId,
    item: item.item || "Untitled item",
    trade: item.trade || "General Conditions",
    payload: item,
    updated_by: userId,
    created_by: userId,
  };
}

export async function listCompanies() {
  return rpc("list_my_companies");
}

export async function searchCompanies(searchTerm) {
  if (!searchTerm.trim()) return [];
  return rpc("search_companies", { search_term: searchTerm.trim() });
}

export async function createCloudCompany(name, userId) {
  const companyId = await rpc("create_company", { company_name: name });
  await seedCompanyDefaults(companyId, name, userId);
  return companyId;
}

export async function renameCloudCompany(companyId, name) {
  return rpc("rename_company", {
    target_company_id: companyId,
    company_name: name,
  });
}

export async function deleteCloudCompany(companyId) {
  return rpc("delete_company", { target_company_id: companyId });
}

export async function requestJoinCompany(companyId) {
  return rpc("request_join_company", { target_company_id: companyId });
}

export async function listJoinRequests(companyId) {
  if (!companyId) return [];
  return rpc("list_join_requests", { target_company_id: companyId });
}

export async function reviewJoinRequest(requestId, approve, role = "estimator") {
  return rpc("review_join_request", {
    target_request_id: requestId,
    approve,
    member_role: role,
  });
}

export async function listCompanyMembers(companyId) {
  if (!companyId) return [];
  return rpc("list_company_members", { target_company_id: companyId });
}

export async function updateCompanyMemberRole(companyId, userId, role) {
  return rpc("update_company_member_role", {
    target_company_id: companyId,
    target_user_id: userId,
    new_role: role,
  });
}

export async function removeCompanyMember(companyId, userId) {
  return rpc("remove_company_member", {
    target_company_id: companyId,
    target_user_id: userId,
  });
}

export async function loadCompanyData(companyId) {
  const [companyRow] = await selectRows(
    "companies",
    `id=eq.${companyId}&select=id,name,settings`,
  );
  const projectRows = await selectRows(
    "company_projects",
    `company_id=eq.${companyId}&select=*&order=updated_at.desc`,
  );
  const priceRows = await selectRows(
    "company_price_book_items",
    `company_id=eq.${companyId}&select=*&order=item.asc`,
  );
  const auditLogs = await selectRows(
    "audit_logs",
    `company_id=eq.${companyId}&select=*&order=created_at.desc&limit=50`,
  );
  const settings = cleanCompanySettings(companyRow?.settings, companyRow?.name);

  return {
    appData: {
      schemaVersion: 3,
      company: settings.company,
      trades: settings.trades,
      priceBook: priceRows.map(rowToPriceBookItem),
      projects: projectRows.map(rowToProject),
    },
    company: companyRow,
    auditLogs,
  };
}

export async function seedCompanyDefaults(companyId, companyName, userId) {
  const blankProject = {
    ...newProject(1),
    name: "New Estimate 1",
    id: crypto.randomUUID(),
  };
  await upsertRows(
    "company_price_book_items",
    initialData.priceBook.map((item) =>
      priceBookItemToRow(
        { ...item, id: crypto.randomUUID() },
        companyId,
        userId,
      ),
    ),
  );
  await upsertRows(
    "company_projects",
    [projectToRow(blankProject, companyId, userId)],
  );
  await updateCompanySettings(companyId, {
    company: {
      ...initialData.company,
      name: companyName || initialData.company.name,
    },
    trades: defaultTrades,
  });
}

export async function saveProjectToCloud(project, companyId, userId) {
  return upsertRows("company_projects", [
    projectToRow(project, companyId, userId),
  ]);
}

export async function deleteProjectFromCloud(projectId) {
  return deleteRows("company_projects", `id=eq.${projectId}`);
}

export async function syncPriceBookToCloud(items, companyId, userId) {
  if (items.length) {
    await upsertRows(
      "company_price_book_items",
      items.map((item) => priceBookItemToRow(item, companyId, userId)),
    );
  }
  const ids = items.map((item) => item.id).filter(Boolean);
  const deleteQuery = ids.length
    ? `company_id=eq.${companyId}&id=not.in.(${ids.join(",")})`
    : `company_id=eq.${companyId}`;
  return deleteRows("company_price_book_items", deleteQuery);
}

export async function updateCompanySettings(companyId, settings) {
  return updateRows("companies", `id=eq.${companyId}`, {
    name: settings.company?.name || "Company",
    settings,
  });
}

export async function importDataToCloud(data, companyId, userId) {
  await updateCompanySettings(companyId, {
    company: data.company,
    trades: data.trades || defaultTrades,
  });
  if (data.projects?.length) {
    await upsertRows(
      "company_projects",
      data.projects.map((project) => projectToRow(project, companyId, userId)),
    );
  }
  if (data.priceBook?.length) {
    await syncPriceBookToCloud(data.priceBook, companyId, userId);
  }
}
