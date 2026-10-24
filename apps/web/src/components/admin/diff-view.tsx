import { cn } from "@/lib/utils";

export type DiffOp = { kind: "same" | "add" | "del"; line: string; a?: number; b?: number };

/** Line diff by longest common subsequence. Fine for prompt templates (hundreds of lines). */
export function lineDiff(a: string, b: string): DiffOp[] {
  const A = a.split("\n");
  const B = b.split("\n");
  const n = A.length;
  const m = B.length;
  // dp[i][j] = LCS length of A[i:], B[j:]
  const dp: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) {
      out.push({ kind: "same", line: A[i], a: i + 1, b: j + 1 });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ kind: "del", line: A[i], a: i + 1 });
      i++;
    } else {
      out.push({ kind: "add", line: B[j], b: j + 1 });
      j++;
    }
  }
  while (i < n) out.push({ kind: "del", line: A[i++], a: i });
  while (j < m) out.push({ kind: "add", line: B[j++], b: j });
  return out;
}

export function DiffView({ a, b, labelA, labelB }: { a: string; b: string; labelA: string; labelB: string }) {
  const ops = lineDiff(a, b);
  const added = ops.filter((o) => o.kind === "add").length;
  const removed = ops.filter((o) => o.kind === "del").length;
  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2 text-xs">
        <span className="text-ink-muted">
          <span className="font-semibold text-bad">{labelA}</span> → <span className="font-semibold text-good">{labelB}</span>
        </span>
        <span className="text-ink-soft">
          <span className="text-good">+{added}</span> <span className="text-bad">−{removed}</span>
        </span>
      </div>
      <pre className="max-h-[70vh] overflow-auto text-xs leading-5">
        {ops.map((o, idx) => (
          <div
            key={idx}
            className={cn("grid grid-cols-[3rem_3rem_1fr] whitespace-pre-wrap break-words px-2", o.kind === "add" && "bg-good-soft text-good", o.kind === "del" && "bg-bad-soft text-bad")}
          >
            <span className="select-none text-right pr-2 text-ink-soft">{o.a ?? ""}</span>
            <span className="select-none text-right pr-2 text-ink-soft">{o.b ?? ""}</span>
            <span>
              <span className="select-none pr-2">{o.kind === "add" ? "+" : o.kind === "del" ? "−" : " "}</span>
              {o.line || " "}
            </span>
          </div>
        ))}
      </pre>
    </div>
  );
}
