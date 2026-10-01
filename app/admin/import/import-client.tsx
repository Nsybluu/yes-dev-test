"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, FileSpreadsheet, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPrice } from "@/lib/format";
import type { AnalyzedRow } from "@/lib/products/import-analyze";
import type { AnalyzeOutcome } from "@/lib/products/import-service";
import type { FieldKey, IssueKind } from "@/lib/products/validation";
import {
  commitImport,
  previewImport,
  type CommitOutcome,
  type Decision,
} from "@/app/admin/import/actions";

type Analysis = Extract<AnalyzeOutcome, { ok: true }>;
type Done = Extract<CommitOutcome, { ok: true }> & { auto: boolean };

const KIND_LABEL: Record<IssueKind, string> = {
  missing: "ข้อมูลหาย",
  type: "ผิดชนิดข้อมูล",
  format: "รูปแบบไม่ถูกต้อง",
  range: "ค่าไม่อยู่ในช่วง",
  duplicate: "ซ้ำในไฟล์",
};

const FIELD_LABEL: Record<FieldKey, string> = {
  sku: "sku",
  name: "ชื่อสินค้า",
  category: "หมวดหมู่",
  price: "ราคา",
  size: "ขนาด",
  description: "รายละเอียด",
  howToUse: "วิธีใช้",
  status: "สถานะ",
};

function formatValue(field: FieldKey, value: string | null) {
  if (value === null || value === "") return <span className="text-muted-foreground">—</span>;
  if (field === "price") return formatPrice(Number(value));
  return <span className="line-clamp-2 break-words whitespace-pre-line">{value}</span>;
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "good" | "warn" | "bad";
}) {
  const color = {
    default: "",
    good: "text-emerald-600 dark:text-emerald-400",
    warn: "text-amber-600 dark:text-amber-400",
    bad: "text-destructive",
  }[tone];
  return (
    <div className="rounded-lg border p-3">
      <div className={`text-2xl font-semibold ${color}`}>{value.toLocaleString("th-TH")}</div>
      <div className="text-muted-foreground text-sm">{label}</div>
    </div>
  );
}

export function ImportClient() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [done, setDone] = useState<Done | null>(null);
  const [tab, setTab] = useState("problems");
  const [pending, startTransition] = useTransition();
  const [busyLabel, setBusyLabel] = useState("");

  function reset() {
    setFile(null);
    setError(null);
    setAnalysis(null);
    setDecisions({});
    setDone(null);
  }

  function makeForm(f: File, extra?: Record<string, string>) {
    const form = new FormData();
    form.set("file", f);
    for (const [k, v] of Object.entries(extra ?? {})) form.set(k, v);
    return form;
  }

  async function runCommit(f: File, picked: Record<string, Decision>, auto: boolean) {
    setBusyLabel("กำลังนำเข้าข้อมูล...");
    const result = await commitImport(makeForm(f, { decisions: JSON.stringify(picked) }));
    if (!result.ok) {
      setError(result.error);
      setAnalysis(null);
      return;
    }
    setAnalysis(null);
    setDone({ ...result, auto });
  }

  function check() {
    if (!file) return;
    setError(null);
    setAnalysis(null);
    setDecisions({});
    setBusyLabel("กำลังตรวจสอบไฟล์...");
    startTransition(async () => {
      const result = await previewImport(makeForm(file));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const s = result.summary;
      // nothing wrong and nothing to ask: import straight away, as the flow promises
      if (s.error === 0 && s.update === 0 && s.rowsWithFixes === 0 && s.new > 0) {
        await runCommit(file, {}, true);
        return;
      }
      setAnalysis(result);
      setTab(
        s.error > 0 ? "problems" : s.update > 0 ? "conflicts" : s.rowsWithFixes > 0 ? "fixes" : "valid",
      );
    });
  }

  function confirm() {
    if (!file) return;
    startTransition(async () => {
      await runCommit(file, decisions, false);
    });
  }

  const rows = analysis?.rows ?? [];
  const problems = rows.filter((r) => r.status === "error");
  const conflicts = rows.filter((r) => r.status === "update");
  const fixed = rows.filter((r) => r.fixes.length > 0);
  const fresh = rows.filter((r) => r.status === "new");
  const undecided = conflicts.filter((r) => !decisions[r.sku]).length;
  const overwriteCount = conflicts.filter((r) => decisions[r.sku] === "overwrite").length;
  const importCount = fresh.length + overwriteCount;

  function decideAll(d: Decision) {
    setDecisions(Object.fromEntries(conflicts.map((r) => [r.sku, d])));
  }

  return (
    <div className="grid gap-6">
      {/* ---------- 1. upload ---------- */}
      <section className="grid gap-4 rounded-lg border p-4 md:p-6">
        <div className="flex items-start gap-3">
          <FileSpreadsheet className="text-muted-foreground mt-0.5 size-5 shrink-0" />
          <div className="grid gap-1 text-sm">
            <p className="font-medium">เลือกไฟล์ Excel (.xlsx)</p>
            <p className="text-muted-foreground">
              แถวแรกเป็นหัวคอลัมน์ ต้องมี <code>sku</code>, <code>name</code>, <code>price</code> ส่วน{" "}
              <code>category</code>, <code>size</code>, <code>description</code>, <code>how_to_use</code>,{" "}
              <code>status</code> ไม่บังคับ · ไม่เกิน 1,000 แถวและ 2 MB
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="max-w-sm"
            aria-label="ไฟล์ Excel"
            disabled={pending}
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setError(null);
              setAnalysis(null);
              setDecisions({});
            }}
          />
          <Button onClick={check} disabled={!file || pending}>
            {pending && !analysis ? <Loader2 className="animate-spin" /> : null}
            {pending && !analysis ? busyLabel : "ตรวจสอบไฟล์"}
          </Button>
        </div>
        {error && (
          <div role="alert" className="text-destructive flex items-start gap-2 text-sm">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </section>

      {/* ---------- 2. summary + details ---------- */}
      {analysis && (
        <>
          <section className="grid gap-3">
            <h2 className="text-lg font-semibold">สรุปผลการตรวจสอบ</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <Stat label="แถวข้อมูลทั้งหมด" value={analysis.summary.totalRows} />
              <Stat label="นำเข้าได้ (สินค้าใหม่)" value={fresh.length} tone="good" />
              <Stat label="SKU ซ้ำกับในระบบ" value={conflicts.length} tone="warn" />
              <Stat label="ไม่มีการเปลี่ยนแปลง" value={analysis.summary.unchanged} />
              <Stat label="มีปัญหา (ไม่นำเข้า)" value={problems.length} tone="bad" />
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              {(
                [
                  ["ข้อมูลหาย", analysis.summary.issueCounts.missing],
                  ["ผิดชนิดข้อมูล", analysis.summary.issueCounts.type],
                  ["รูปแบบ/ค่าไม่ถูกต้อง", analysis.summary.issueCounts.format + analysis.summary.issueCounts.range],
                  ["SKU ซ้ำในไฟล์", analysis.summary.issueCounts.duplicate],
                  ["แก้ตัวพิมพ์เล็ก-ใหญ่ให้", analysis.summary.fixCounts.case],
                  ["ล้างสัญลักษณ์ในตัวเลขให้", analysis.summary.fixCounts.clean],
                ] as const
              )
                .filter(([, n]) => n > 0)
                .map(([label, n]) => (
                  <Badge key={label} variant="outline">
                    {label} {n}
                  </Badge>
                ))}
              {analysis.summary.blankRows > 0 && (
                <Badge variant="outline">ข้ามแถวว่าง {analysis.summary.blankRows}</Badge>
              )}
            </div>
            {analysis.unknownColumns.length > 0 && (
              <p className="text-muted-foreground text-sm">
                คอลัมน์ที่ระบบไม่ใช้ (ถูกข้าม): {analysis.unknownColumns.join(", ")}
              </p>
            )}
          </section>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="problems">มีปัญหา ({problems.length})</TabsTrigger>
              <TabsTrigger value="conflicts">SKU ซ้ำ ({conflicts.length})</TabsTrigger>
              <TabsTrigger value="fixes">แก้ให้อัตโนมัติ ({fixed.length})</TabsTrigger>
              <TabsTrigger value="valid">นำเข้าได้ ({fresh.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="problems" className="mt-4">
              <ProblemsTable rows={problems} />
            </TabsContent>

            <TabsContent value="conflicts" className="mt-4 grid gap-4">
              {conflicts.length === 0 ? (
                <Empty text="ไม่มี SKU ที่ซ้ำกับสินค้าในระบบ" />
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-muted-foreground mr-auto text-sm">
                      SKU เหล่านี้มีอยู่ในระบบแล้วและข้อมูลต่างจากไฟล์ เลือกว่าจะเขียนทับหรือข้าม
                      (ช่องที่ว่างในไฟล์จะไม่ลบข้อมูลเดิม)
                    </p>
                    <Button size="sm" variant="outline" onClick={() => decideAll("overwrite")}>
                      เขียนทับทั้งหมด
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => decideAll("skip")}>
                      ข้ามทั้งหมด
                    </Button>
                  </div>
                  {conflicts.map((row) => (
                    <ConflictCard
                      key={row.rowNumber}
                      row={row}
                      decision={decisions[row.sku]}
                      onDecide={(d) => setDecisions((prev) => ({ ...prev, [row.sku]: d }))}
                    />
                  ))}
                </>
              )}
            </TabsContent>

            <TabsContent value="fixes" className="mt-4">
              {fixed.length === 0 ? (
                <Empty text="ไม่มีข้อมูลที่ต้องแก้ให้อัตโนมัติ" />
              ) : (
                <div className="grid gap-2">
                  <p className="text-muted-foreground text-sm">
                    ระบบปรับค่าเหล่านี้ให้ถูกรูปแบบโดยอัตโนมัติ (ความหมายเดิมไม่เปลี่ยน)
                  </p>
                  <div className="max-h-[28rem] overflow-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-20">แถว</TableHead>
                          <TableHead>คอลัมน์</TableHead>
                          <TableHead>ค่าในไฟล์</TableHead>
                          <TableHead>ระบบแก้เป็น</TableHead>
                          <TableHead>ประเภท</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fixed.flatMap((row) =>
                          row.fixes.map((fix, i) => (
                            <TableRow key={`${row.rowNumber}-${i}`}>
                              <TableCell>{row.rowNumber}</TableCell>
                              <TableCell>{FIELD_LABEL[fix.field]}</TableCell>
                              <TableCell className="font-mono text-xs">{fix.from}</TableCell>
                              <TableCell className="font-mono text-xs">{fix.to}</TableCell>
                              <TableCell>
                                <Badge variant="secondary">
                                  {fix.kind === "case" ? "ตัวพิมพ์เล็ก-ใหญ่" : "ล้างสัญลักษณ์"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          )),
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="valid" className="mt-4">
              {fresh.length === 0 ? (
                <Empty text="ไม่มีสินค้าใหม่ที่จะนำเข้า" />
              ) : (
                <div className="max-h-[28rem] overflow-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">แถว</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>ชื่อสินค้า</TableHead>
                        <TableHead>หมวดหมู่</TableHead>
                        <TableHead className="text-right">ราคา</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fresh.map((row) => (
                        <TableRow key={row.rowNumber}>
                          <TableCell>{row.rowNumber}</TableCell>
                          <TableCell className="font-medium">{row.data?.sku}</TableCell>
                          <TableCell className="max-w-72 truncate">{row.data?.name}</TableCell>
                          <TableCell className="text-muted-foreground">{row.data?.category ?? "-"}</TableCell>
                          <TableCell className="text-right">{formatPrice(Number(row.data?.price))}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* ---------- 3. confirm ---------- */}
          <div className="bg-background/95 sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-3 border-t px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
            <p className="text-muted-foreground mr-auto text-sm">
              {undecided > 0
                ? `ยังไม่ได้เลือกสำหรับ SKU ซ้ำอีก ${undecided} รายการ (แท็บ "SKU ซ้ำ")`
                : importCount === 0
                  ? "ไม่มีรายการที่จะนำเข้า"
                  : problems.length > 0
                    ? `จะข้าม ${problems.length} แถวที่มีปัญหา — แก้ไฟล์แล้วอัปโหลดใหม่ได้ภายหลัง`
                    : "พร้อมนำเข้า"}
            </p>
            <Button variant="outline" onClick={reset} disabled={pending}>
              ยกเลิก
            </Button>
            <Button onClick={confirm} disabled={pending || undecided > 0 || importCount === 0}>
              {pending ? <Loader2 className="animate-spin" /> : <ArrowRight />}
              {pending
                ? busyLabel
                : `นำเข้า ${importCount.toLocaleString("th-TH")} รายการ${
                    problems.length > 0 ? ` (ข้าม ${problems.length} แถวที่มีปัญหา)` : ""
                  }`}
            </Button>
          </div>
        </>
      )}

      {/* ---------- success popup ---------- */}
      <Dialog open={done !== null} onOpenChange={(open) => !open && reset()}>
        <DialogContent>
          <DialogHeader className="items-center text-center">
            <CheckCircle2 className="size-12 text-emerald-600 dark:text-emerald-400" />
            <DialogTitle>นำเข้าสำเร็จ</DialogTitle>
            <DialogDescription>
              {done?.auto
                ? "ไฟล์ผ่านการตรวจสอบทุกแถว ไม่พบข้อมูลขาดหายหรือผิดพลาด"
                : "นำเข้ารายการที่เลือกเรียบร้อยแล้ว"}
            </DialogDescription>
          </DialogHeader>
          {done && (
            <ul className="grid gap-1 text-center text-sm">
              <li>เพิ่มสินค้าใหม่ {done.created.toLocaleString("th-TH")} รายการ</li>
              {done.updated > 0 && <li>อัปเดตสินค้าเดิม {done.updated.toLocaleString("th-TH")} รายการ</li>}
              {done.skipped > 0 && (
                <li className="text-muted-foreground">ข้าม SKU ซ้ำ {done.skipped.toLocaleString("th-TH")} รายการ</li>
              )}
              {done.errorRows > 0 && (
                <li className="text-muted-foreground">ข้ามแถวที่มีปัญหา {done.errorRows.toLocaleString("th-TH")} แถว</li>
              )}
            </ul>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={reset}>
              นำเข้าไฟล์อื่น
            </Button>
            <Button render={<Link href="/admin/products" />}>ดูรายการสินค้า</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">{text}</p>;
}

function ProblemsTable({ rows }: { rows: AnalyzedRow[] }) {
  if (rows.length === 0) return <Empty text="ไม่พบแถวที่มีปัญหา" />;
  return (
    <div className="grid gap-2">
      <p className="text-muted-foreground text-sm">
        แถวเหล่านี้จะไม่ถูกนำเข้า แก้ไขในไฟล์ Excel (เลขแถวตรงกับเลขแถวใน Excel) แล้วอัปโหลดใหม่
      </p>
      <div className="max-h-[28rem] overflow-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">แถว</TableHead>
              <TableHead>สินค้า</TableHead>
              <TableHead>คอลัมน์</TableHead>
              <TableHead>ค่าที่พบ</TableHead>
              <TableHead>ปัญหา</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.flatMap((row) =>
              row.issues.map((issue, i) => (
                <TableRow key={`${row.rowNumber}-${i}`}>
                  <TableCell>{row.rowNumber}</TableCell>
                  <TableCell className="max-w-48 truncate">{row.sku || row.name || "-"}</TableCell>
                  <TableCell>{FIELD_LABEL[issue.field]}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {issue.value ?? <span className="text-muted-foreground">(ว่าง)</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="destructive">{KIND_LABEL[issue.kind]}</Badge>
                      <span className="text-sm">{issue.message}</span>
                    </div>
                  </TableCell>
                </TableRow>
              )),
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ConflictCard({
  row,
  decision,
  onDecide,
}: {
  row: AnalyzedRow;
  decision: Decision | undefined;
  onDecide: (d: Decision) => void;
}) {
  return (
    <div className="rounded-lg border">
      <div className="flex flex-wrap items-center gap-3 border-b p-3">
        <div className="mr-auto min-w-0">
          <p className="truncate font-medium">
            {row.sku} · {row.data?.name}
          </p>
          <p className="text-muted-foreground text-xs">แถว {row.rowNumber} ในไฟล์</p>
        </div>
        <div className="flex gap-2" role="group" aria-label={`ตัวเลือกสำหรับ ${row.sku}`}>
          <Button
            size="sm"
            variant={decision === "overwrite" ? "default" : "outline"}
            aria-pressed={decision === "overwrite"}
            onClick={() => onDecide("overwrite")}
          >
            เขียนทับ
          </Button>
          <Button
            size="sm"
            variant={decision === "skip" ? "default" : "outline"}
            aria-pressed={decision === "skip"}
            onClick={() => onDecide("skip")}
          >
            ข้าม
          </Button>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-32">ข้อมูลที่เปลี่ยน</TableHead>
            <TableHead>ค่าเดิมในระบบ</TableHead>
            <TableHead>ค่าใหม่ในไฟล์</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {row.changes.map((c) => (
            <TableRow key={c.field}>
              <TableCell className="text-muted-foreground">{FIELD_LABEL[c.field]}</TableCell>
              <TableCell>{formatValue(c.field, c.before)}</TableCell>
              <TableCell className="font-medium">{formatValue(c.field, c.after)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
