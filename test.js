/*
	Smoke test runner for SmartMart API.
	Usage:
		1) Start API server (local or deployed)
		2) Optionally set BASE_URL, e.g. BASE_URL=http://localhost:3000
		3) Run: node test.js
*/

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS || 10000);

const checks = [
	{
		name: "Get categories",
		method: "GET",
		path: "/getCategory",
		expect: (status) => status >= 200 && status < 300,
	},
	{
		name: "Get units",
		method: "GET",
		path: "/getUnits",
		expect: (status) => status >= 200 && status < 300,
	},
	{
		name: "Get products",
		method: "GET",
		path: "/getProducts",
		expect: (status) => status >= 200 && status < 300,
	},
	{
		name: "Get invoice number",
		method: "GET",
		path: "/getInvoiceNo",
		expect: (status) => status >= 200 && status < 300,
	},
	{
		name: "Get purchases",
		method: "GET",
		path: "/getPurchase",
		expect: (status) => status >= 200 && status < 300,
	},
	{
		name: "Get sales report",
		method: "GET",
		path: "/getSalesReport",
		expect: (status) => status >= 200 && status < 300,
	},
	{
		name: "Login validation path",
		method: "POST",
		path: "/login",
		body: { username: "__smoke_invalid__", password: "wrong" },
		expect: (status) => status === 400 || status === 401 || status === 404,
	},
];

async function requestWithTimeout(url, options, timeoutMs) {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const response = await fetch(url, { ...options, signal: controller.signal });
		return response;
	} finally {
		clearTimeout(timeout);
	}
}

async function runCheck(check) {
	const url = `${BASE_URL}${check.path}`;
	const options = {
		method: check.method,
		headers: { "Content-Type": "application/json" },
	};

	if (check.body) {
		options.body = JSON.stringify(check.body);
	}

	const startedAt = Date.now();

	try {
		const response = await requestWithTimeout(url, options, TIMEOUT_MS);
		const elapsed = Date.now() - startedAt;
		const ok = check.expect(response.status);

		return {
			ok,
			name: check.name,
			status: response.status,
			elapsed,
			path: check.path,
		};
	} catch (error) {
		const elapsed = Date.now() - startedAt;
		return {
			ok: false,
			name: check.name,
			status: "ERR",
			elapsed,
			path: check.path,
			error: error.name === "AbortError" ? "Timeout" : error.message,
		};
	}
}

async function main() {
	console.log(`Running smoke checks against ${BASE_URL}`);

	const results = [];
	for (const check of checks) {
		// Run sequentially to avoid noisy DB contention in smaller deployments.
		const result = await runCheck(check);
		results.push(result);
	}

	const failed = results.filter((r) => !r.ok);
	const passed = results.length - failed.length;

	console.table(
		results.map((r) => ({
			name: r.name,
			method_path: `${checks.find((c) => c.name === r.name).method} ${r.path}`,
			status: r.status,
			ms: r.elapsed,
			result: r.ok ? "PASS" : "FAIL",
			error: r.error || "",
		}))
	);

	if (failed.length > 0) {
		console.error(`Smoke failed: ${failed.length}/${results.length} failed.`);
		process.exit(1);
	}

	console.log(`Smoke passed: ${passed}/${results.length} checks passed.`);
}

main().catch((err) => {
	console.error("Smoke runner crashed:", err);
	process.exit(1);
});
