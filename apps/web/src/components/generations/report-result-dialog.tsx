"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { BarChart3, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PredictionRow } from "@/lib/data/generations";
import { reportResult } from "@/lib/actions/generations";

const METRICS = [
  { id: "conversion_rate", label: "Conversion rate (%)" },
  { id: "click_through_rate", label: "Click-through rate (%)" },
  { id: "open_rate", label: "Open rate (%)" },
  { id: "reply_rate", label: "Reply rate (%)" },
  { id: "revenue_per_visitor", label: "Revenue per visitor ($)" },
  { id: "earnings_per_click", label: "Earnings per click ($)" },
  { id: "cost_per_acquisition", label: "Cost per acquisition ($)" },
  { id: "registrations", label: "Registrations (count)" },
  { id: "other", label: "Other" },
];

export function ReportResultDialog({ generationId, prediction, canEdit }: { generationId: string; prediction: PredictionRow | null; canEdit: boolean }) {
  const [open, setOpen] = useState(false);
  const [metric, setMetric] = useState("conversion_rate");
  const [value, setValue] = useState("");
  const [control, setControl] = useState("");
  const [refund, setRefund] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, start] = useTransition();
  const reported = prediction?.reported_result as { metric?: string; value?: number; control_value?: number | null } | null;

  const submit = () => {
    const v = Number(value);
    if (!value.trim() || !Number.isFinite(v)) {
      toast.error("Enter the result as a number.");
      return;
    }
    start(async () => {
      const res = await reportResult({ generation_id: generationId, metric, value: v, control_value: control.trim() ? Number(control) : null, refund_rate: refund.trim() ? Number(refund) : null, notes });
      if (!res.ok) toast.error(res.error);
      else {
        toast.success("Result logged against the prediction");
        setOpen(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={!canEdit}>
          <BarChart3 className="h-3.5 w-3.5" /> {reported ? "Update what happened" : "Log what happened"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>How did this piece do?</DialogTitle>
          <DialogDescription>
            Once you have used it, record the result. Over time this shows how often the copy chief&apos;s calls were right.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Metric</Label>
            <Select value={metric} onValueChange={setMetric}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {METRICS.map((m) => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="rr-value">This copy</Label>
              <Input id="rr-value" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder={reported?.value != null ? String(reported.value) : "3.2"} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rr-control">Control</Label>
              <Input id="rr-control" inputMode="decimal" value={control} onChange={(e) => setControl(e.target.value)} placeholder={reported?.control_value != null ? String(reported.control_value) : "2.8"} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rr-refund">Refund rate at 30 days (%)</Label>
            <Input id="rr-refund" inputMode="decimal" value={refund} onChange={(e) => setRefund(e.target.value)} placeholder={prediction?.refund_rate != null ? String(Number(prediction.refund_rate) * 100) : "Optional"} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rr-notes">Notes</Label>
            <Textarea id="rr-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Traffic source, sample size, dates." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
          <Button onClick={submit} disabled={pending}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save result</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
