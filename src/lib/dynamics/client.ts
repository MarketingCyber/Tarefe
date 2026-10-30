import fs from "node:fs";
import httpntlm from "httpntlm";

/**
 * Read-only client for the old CRM (Dynamics 365 on-premise 9.1, `tarefe.online/Tarefe`), used by the mirror sync
 * (sync.ts). Dynamics only accepts Windows sign-in (NTLM), which Node's fetch can't do, hence httpntlm — the same
 * library the old api.tarefe.de server uses against this CRM.
 *
 * Configuration (server .env, never in git):
 *   DYNAMICS_CRM_URL       Web API root, default http://tarefe.online/Tarefe/api/data/v9.1/
 *   DYNAMICS_CRM_USER      the CRM service user (DOMAIN\name or name)
 *   DYNAMICS_CRM_PASSWORD
 *   DYNAMICS_CRM_CREDENTIALS_FILE  alternative for the laptop: a 2-line file (username, password)
 * Only GET requests exist here: this client cannot change anything in Dynamics.
 */
const BASE = (process.env.DYNAMICS_CRM_URL || "http://tarefe.online/Tarefe/api/data/v9.1/").replace(/\/?$/, "/");

type Login = { username: string; password: string; domain: string };

function login(): Login | null {
  let user = process.env.DYNAMICS_CRM_USER;
  let password = process.env.DYNAMICS_CRM_PASSWORD;
  const file = process.env.DYNAMICS_CRM_CREDENTIALS_FILE;
  if ((!user || !password) && file && fs.existsSync(file)) {
    [user, password] = fs.readFileSync(file, "utf8").replace(/^﻿/, "").split(/\r?\n/).map((s) => s.trim());
  }
  if (!user || !password) return null;
  const [domain, username] = user.includes("\\") ? user.split("\\", 2) : ["", user];
  return { username, password, domain };
}

export const crmConfigured = () => login() !== null;

export class CrmError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const PREFER = 'odata.include-annotations="OData.Community.Display.V1.FormattedValue",odata.maxpagesize=500';

function getOnce(url: string, extraPrefer?: string): Promise<{ status: number; body: string }> {
  const l = login();
  if (!l) return Promise.reject(new CrmError(0, "Dynamics login not configured"));
  return new Promise((resolve, reject) => {
    httpntlm.get(
      {
        url,
        username: l.username,
        password: l.password,
        domain: l.domain,
        workstation: "",
        ntlm_version: 2,
        timeout: 120_000,
        headers: {
          Accept: "application/json",
          "OData-MaxVersion": "4.0",
          "OData-Version": "4.0",
          Prefer: extraPrefer ? `${PREFER},${extraPrefer}` : PREFER,
        },
      },
      (err: Error | null, res: { statusCode: number; body: string } | undefined) => {
        if (err || !res) reject(new CrmError(0, err?.message ?? "no response"));
        else resolve({ status: res.statusCode, body: res.body });
      },
    );
  });
}

/** GET a Web API path (relative to the API root) or a full nextLink/deltaLink; retries dropped connections. */
export async function crmGet<T = unknown>(pathOrUrl: string, opts: { trackChanges?: boolean } = {}): Promise<T> {
  const url = /^https?:/.test(pathOrUrl) ? pathOrUrl : BASE + pathOrUrl.replace(/^\//, "");
  const encoded = url.replace(/ /g, "%20");
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await getOnce(encoded, opts.trackChanges ? "odata.track-changes" : undefined);
      if (res.status === 200) return JSON.parse(res.body) as T;
      const message = (() => {
        try {
          return JSON.parse(res.body).error?.message ?? res.body.slice(0, 300);
        } catch {
          return res.body.slice(0, 300);
        }
      })();
      // 4xx (no permission, bad query) won't get better by retrying.
      if (res.status >= 400 && res.status < 500) throw new CrmError(res.status, message);
      if (attempt >= 4) throw new CrmError(res.status, message);
    } catch (error) {
      if (error instanceof CrmError && error.status >= 400 && error.status < 500) throw error;
      if (attempt >= 4) throw error;
    }
    await new Promise((r) => setTimeout(r, attempt * 2000));
  }
}
