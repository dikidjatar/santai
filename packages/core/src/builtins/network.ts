// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import * as cp from "child_process";
import { SantaiHttpResponse } from "../objects/object-network";

export interface HttpParams {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  timeout: number;
  followRedirects: boolean;
}

export type HttpResult =
  | {
      ok: true;
      status: number;
      statusText: string;
      url: string;
      headers: Record<string, string>;
      /**
       * response body in base64
       */
      body: string;
      redirected: boolean;
    }
  | {
      ok: false;
      error: string;
      code?: string;
    };

export interface HttpOptions {
  method: string;
  headers: Record<string, string>;
  timeout: number;
  followRedirects: boolean;
  body?: string;
}

const FETCH_SCRIPT = /* javascript */ `

  const rawParams = process.env["__SANTAI_HTTP__"] ?? "{}"
  const params = JSON.parse(rawParams);
  const {
    url,
    method  = 'GET',
    headers = {},
    body,
    timeout,
    followRedirects
  } = params;

  const ctrl = new AbortController();
  const timer = setTimeout(() => {
    ctrl.abort(new Error("timeout (" + timeout + "ms)"))
  }, timeout);

  try {
    const fetchOpts = {
      method:   method,
      headers:  headers,
      signal:   ctrl.signal,
      redirect: followRedirects ? "follow" : "manual",
    };
 
    // Only include the body for the relevant method
    const canHaveBody = !["GET", "HEAD", "OPTIONS"]
      .includes(method.toUpperCase());
    if (canHaveBody && body !== null && body !== "") {
      fetchOpts.body = body;
    }
 
    const res = await fetch(url, fetchOpts);
    clearTimeout(timer);
 
    const buf  = await res.arrayBuffer();
    const headers2 = {};
    res.headers.forEach((v, k) => { headers2[k] = v; });
 
    process.stdout.write(
      JSON.stringify({
        ok:         true,
        status:     res.status,
        statusText: res.statusText,
        url:        res.url,
        headers:    headers2,
        body:       Buffer.from(buf).toString("base64"),
        redirected: res.redirected,
      })
    );
  } catch (e) {
    clearTimeout(timer);
    const isAbort = e?.name === "AbortError" ||
                    e?.message?.includes("abort");
    process.stdout.write(
      JSON.stringify({
        ok:         false,
        error:      e?.message ?? String(e),
        name:       e?.name,
        stack:      e?.stack,
        code:       isAbort ? "TIMEOUT" : (e?.code ?? "FETCH_ERROR"),
      })
    );
  }
`;

export function syncHttp(params: HttpParams): HttpResult {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    __SANTAI_HTTP__: JSON.stringify(params),
  };

  const result = cp.spawnSync(process.execPath, ["--input-type=module"], {
    input: FETCH_SCRIPT,
    env,
    timeout: params.timeout + 15_000,
    maxBuffer: 256 * 1024 * 1024, // 256MB
  });

  if (result.error) {
    return {
      ok: false,
      error: result.error.message,
      code: (result.error as NodeJS.ErrnoException).code ?? "SPAWN_ERROR",
    };
  }

  const stdout = result.stdout?.toString("utf-8").trim() ?? "";

  if (!stdout) {
    const stderr = result.stderr?.toString("utf-8").trim() ?? "";
    return {
      ok: false,
      error: stderr || `process exit with code ${result.status}`,
      code: "PROCESS_ERROR",
    };
  }

  try {
    return JSON.parse(stdout) as HttpResult;
  } catch {
    return {
      ok: false,
      error: `Invalid json response: ${stdout.slice(0, 300)}`,
      code: "PARSE_ERROR",
    };
  }
}

export function buildHttpResponse(result: HttpResult): SantaiHttpResponse {
  if (!result.ok) {
    return new SantaiHttpResponse(false, "", "", {}, 0, result.error, false);
  }

  return new SantaiHttpResponse(
    true,
    result.url,
    result.body,
    result.headers,
    result.status,
    result.statusText,
    result.redirected
  );
}

export function doHttpRequest(
  url: string,
  method: string,
  options: HttpOptions,
  bodyOverride?: string
): SantaiHttpResponse {
  const params: HttpParams = {
    url,
    method: method.toUpperCase(),
    headers: options.headers,
    body: bodyOverride ?? options.body,
    timeout: options.timeout,
    followRedirects: options.followRedirects,
  };

  const result = syncHttp(params);
  return buildHttpResponse(result);
}
