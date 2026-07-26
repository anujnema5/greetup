/**
 * Kills whatever is listening on the greetup dev ports.
 * Works on Windows, macOS, and Linux.
 *
 * Usage: bun run kill:ports
 *    or: bun scripts/kill-dev-ports.js
 */

const ports = [
  3000, // client (next dev)
  3001, // client (next dev fallback)
  5300, // server
  4020, // matching-service
  5370, // rtc-service
];

const isWindows = process.platform === "win32";

async function pidsOnPort(port) {
  if (isWindows) {
    const proc = Bun.spawn(
      [
        "powershell",
        "-NoProfile",
        "-Command",
        `(Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue).OwningProcess`,
      ],
      { stdout: "pipe", stderr: "pipe" },
    );
    const out = (await new Response(proc.stdout).text()).trim();
    await proc.exited;
    if (!out) return [];
    return [
      ...new Set(
        out
          .split(/\r?\n/)
          .map((s) => Number(s.trim()))
          .filter((n) => n > 0),
      ),
    ];
  }

  const proc = Bun.spawn(["lsof", "-ti", `tcp:${port}`], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = (await new Response(proc.stdout).text()).trim();
  await proc.exited;
  if (!out) return [];
  return [
    ...new Set(
      out
        .split(/\r?\n/)
        .map((s) => Number(s.trim()))
        .filter((n) => n > 0),
    ),
  ];
}

async function killPid(pid) {
  if (isWindows) {
    const nameProc = Bun.spawn(
      [
        "powershell",
        "-NoProfile",
        "-Command",
        `(Get-Process -Id ${pid} -ErrorAction SilentlyContinue).ProcessName`,
      ],
      { stdout: "pipe", stderr: "pipe" },
    );
    const name = (await new Response(nameProc.stdout).text()).trim() || undefined;
    await nameProc.exited;

    const kill = Bun.spawn(["taskkill", "/F", "/PID", String(pid)], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const err = (await new Response(kill.stderr).text()).trim();
    const code = await kill.exited;
    return code === 0
      ? { ok: true, name }
      : { ok: false, name, error: err || `exit ${code}` };
  }

  let name;
  try {
    const nameProc = Bun.spawn(["ps", "-p", String(pid), "-o", "comm="], {
      stdout: "pipe",
      stderr: "pipe",
    });
    name = (await new Response(nameProc.stdout).text()).trim() || undefined;
    await nameProc.exited;
  } catch {
    // ignore name lookup failures
  }

  const kill = Bun.spawn(["kill", "-9", String(pid)], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const err = (await new Response(kill.stderr).text()).trim();
  const code = await kill.exited;
  return code === 0
    ? { ok: true, name }
    : { ok: false, name, error: err || `exit ${code}` };
}

const killed = new Set();

for (const port of ports) {
  let pids;
  try {
    pids = await pidsOnPort(port);
  } catch {
    continue;
  }

  for (const pid of pids) {
    if (killed.has(pid)) continue;
    const result = await killPid(pid);
    if (result.ok) {
      killed.add(pid);
      const label = result.name ? ` (${result.name})` : "";
      console.log(`Killed PID ${pid}${label} on port ${port}`);
    } else {
      console.error(`Could not kill PID ${pid} on port ${port}: ${result.error}`);
    }
  }
}

if (killed.size === 0) {
  console.log(`No dev processes were listening on: ${ports.join(", ")}`);
} else {
  console.log(`Done. Freed ${killed.size} process(es).`);
}
