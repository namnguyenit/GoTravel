import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CreditCard,
  RefreshCcw,
  ArrowUpRight,
  ReceiptText,
} from "lucide-react";
import { httpClient } from "@/shared/infrastructure/http/HttpPort";
import { formatVnd } from "@/shared/domain/money.vo";
import {
  Button,
  PageHeader,
  SurfaceCard,
  Pagination,
  IdText,
  LoadingState,
  EmptyState,
} from "@/shared/presentation/components";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { TransportCommissionSettings } from "./TransportCommissionSettings";
import { SettlementSimulationButton } from "../components/SettlementSimulationButton";

type Amount = string | number;
type Payout = {
  payoutId: string;
  orderId: string;
  hostId: string;
  status: string;
  totalAmount: Amount;
  commissionRate: Amount;
  commissionAmount: Amount;
  hostAmount: Amount;
  createdAt: string;
  paidAt?: string;
  settlementSimulated?: boolean;
};
type CashShift = {
  shiftId: string;
  operatorId: string;
  grossAmount: Amount;
  refundedAmount: Amount;
  commissionRate: Amount;
  commissionDue: Amount;
  commissionPaid: Amount;
  outstandingAmount: Amount;
  paymentRecorded: boolean;
  settlementSimulated?: boolean;
  simulationAmount?: Amount;
  recordedAt: string;
};
type Operator = { id: string; userId: string; name: string };
type Page<T> = { content: T[]; totalPages: number; totalElements: number };
type CashSummary = {
  shifts: number;
  grossAmount: Amount;
  refundedAmount: Amount;
  commissionDue: Amount;
  commissionPaid: Amount;
  outstandingAmount: Amount;
};
type Proof = { kind: "online"; row: Payout } | { kind: "cash"; row: CashShift };
const statuses: Record<
  string,
  { label: string; hint: string; className: string }
> = {
  REQUESTED: {
    label: "Đã yêu cầu rút",
    hint: "Nhà xe đã yêu cầu rút. Đối chiếu số phải chi rồi xác nhận quyết toán; khoản mô phỏng được ghi nhãn riêng.",
    className: "bg-amber-50 text-amber-800",
  },
  PENDING: {
    label: "Chưa yêu cầu rút",
    hint: "Đây là khoản ghi nhận sau thanh toán. Nhà xe cần gửi yêu cầu rút trước khi Admin ghi nhận chi trả.",
    className: "bg-slate-100 text-slate-700",
  },
  PAID: {
    label: "Đã chi trả",
    hint: "Các khoản đã hoàn tất quyết toán. Khoản thử nghiệm có nhãn đã chi trả mô phỏng.",
    className: "bg-emerald-50 text-emerald-800",
  },
  CANCELLED: {
    label: "Đã hủy khoản chi",
    hint: "Các khoản chi đã bị hủy hoặc chuyển sang xử lý hoàn tiền.",
    className: "bg-slate-100 text-slate-600",
  },
};
const money = (v: Amount | null | undefined) =>
  v == null ? "—" : formatVnd(String(v));
const time = (value?: string) => {
  if (!value) return "—";
  const date = new Date(
    /Z$|[+-]\d{2}:?\d{2}$/.test(value) ? value : value + "+07:00"
  );
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "Asia/Ho_Chi_Minh",
      }).format(date);
};
const field =
  "h-11 rounded-xl border border-[var(--gt-border)] bg-white px-3 text-sm text-[var(--gt-ink)] focus:outline-2 focus:outline-[var(--gt-brand)] disabled:opacity-60";

export function AdminPayoutsPage() {
  const [tab, setTab] = useState<"online" | "cash">("online");
  const [status, setStatus] = useState("REQUESTED");
  const [operatorId, setOperatorId] = useState("");
  const [operators, setOperators] = useState<Operator[]>([]);
  const [operatorSearch, setOperatorSearch] = useState("");
  const [operatorError, setOperatorError] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Payout[]>([]);
  const [shifts, setShifts] = useState<CashShift[]>([]);
  const [summary, setSummary] = useState<CashSummary | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [simulationEnabled, setSimulationEnabled] = useState(false);
  const [simulationError, setSimulationError] = useState("");
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [detail, setDetail] = useState<Payout | null>(null);
  const [proof, setProof] = useState<Proof | null>(null);
  const [reference, setReference] = useState("");
  const [evidence, setEvidence] = useState("");
  const [dialogError, setDialogError] = useState("");
  const selected = operators.find((op) => op.id === operatorId);
  const completedSimulation = (message: string) => {
    setNotice(message);
    setRevision((value) => value + 1);
  };
  useEffect(() => {
    const controller = new AbortController();
    httpClient
      .get<{ enabled: boolean }>("/api/v1/payouts/transport/simulation", {
        signal: controller.signal,
        cache: "no-store",
      })
      .then((result) => {
        if (!controller.signal.aborted) {
          setSimulationEnabled(result.enabled);
          setSimulationError("");
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setSimulationEnabled(false);
          setSimulationError(
            "Chưa tải được chế độ mô phỏng. Bấm Tải lại để thử lại."
          );
        }
      });
    return () => controller.abort();
  }, [revision]);
  const byOwner = useMemo(
    () => new Map(operators.map((op) => [op.userId, op.name])),
    [operators]
  );
  const byId = useMemo(
    () => new Map(operators.map((op) => [op.id, op.name])),
    [operators]
  );
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      httpClient
        .get<{ data: Operator[] }>("/api/v1/operators", {
          params: { limit: 100, search: operatorSearch || undefined },
          signal: controller.signal,
        })
        .then((result) => {
          setOperators((previous) => {
            const merged = new Map(previous.map((op) => [op.id, op]));
            result.data.forEach((op) => merged.set(op.id, op));
            return [...merged.values()];
          });
          setOperatorError("");
        })
        .catch((e) => {
          if (!controller.signal.aborted) setOperatorError(e.message);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [operatorSearch]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const load = async () => {
      if (tab === "online") {
        const result = await httpClient.get<Page<Payout>>(
          "/api/v1/payouts/all",
          {
            params: {
              providerType: "TRANSPORT",
              status: status || undefined,
              hostId: selected?.userId,
              page: page - 1,
              size: 20,
            },
            signal: controller.signal,
          }
        );
        if (controller.signal.aborted) return;
        setRows(result.content);
        setTotalPages(result.totalPages);
        setTotal(result.totalElements);
      } else {
        const [result, totals] = await Promise.all([
          httpClient.get<Page<CashShift>>(
            "/api/v1/payouts/transport/cash-settlements",
            {
              params: {
                operatorId: operatorId || undefined,
                page: page - 1,
                size: 20,
              },
              signal: controller.signal,
            }
          ),
          httpClient.get<CashSummary>(
            "/api/v1/payouts/transport/cash-summary",
            {
              params: { operatorId: operatorId || undefined },
              signal: controller.signal,
            }
          ),
        ]);
        if (controller.signal.aborted) return;
        setShifts(result.content);
        setSummary(totals);
        setTotalPages(result.totalPages);
        setTotal(result.totalElements);
      }
    };
    load()
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [tab, status, operatorId, selected?.userId, page, revision]);
  const openProof = useCallback(async (value: Proof) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const ready: Proof =
        value.kind === "online"
          ? {
              kind: "online",
              row: await httpClient.post<Payout>(
                `/api/v1/payouts/transport/${value.row.payoutId}/prepare`
              ),
            }
          : value;
      setProof(ready);
      setReference("");
      setEvidence("");
      setDialogError("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Chưa đối chiếu được khoản tiền."
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }, []);
  const recordProof = async () => {
    if (!proof || lock.current) return;
    let url: URL;
    try {
      url = new URL(evidence.trim());
      if (url.protocol !== "https:" || url.username || url.password)
        throw Error();
    } catch {
      setDialogError("Nhập đường dẫn chứng từ HTTPS hợp lệ.");
      return;
    }
    if (!reference.trim()) {
      setDialogError("Nhập mã giao dịch trên chứng từ.");
      return;
    }
    lock.current = true;
    setBusy(true);
    setDialogError("");
    try {
      const amount =
        proof.kind === "online"
          ? proof.row.hostAmount
          : proof.row.commissionDue;
      const path =
        proof.kind === "online"
          ? `/api/v1/payouts/transport/${proof.row.payoutId}/mark-paid`
          : `/api/v1/payouts/transport/cash-settlements/${proof.row.shiftId}/mark-paid`;
      await httpClient.put(path, {
        amount,
        reference: reference.trim(),
        evidenceUrl: url.href,
      });
      setNotice(
        proof.kind === "online"
          ? "Đã ghi nhận chi trả cho nhà xe."
          : "Đã ghi nhận nhà xe nộp hoa hồng của ca."
      );
      setProof(null);
      setRevision((v) => v + 1);
    } catch (e) {
      setDialogError(
        e instanceof Error ? e.message : "Chưa lưu được chứng từ."
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const filter = (fn: () => void) => {
    fn();
    setPage(1);
    setNotice("");
  };
  const displayOperators = operators.filter(
    (op) =>
      !operatorSearch ||
      op.name
        .toLocaleLowerCase("vi")
        .includes(operatorSearch.toLocaleLowerCase("vi")) ||
      op.id === operatorId
  );
  return (
    <div className="space-y-6">
      <PageHeader
        title="Quyết toán & hoa hồng"
        description="Theo dõi tiền chi trả nhà xe và hoa hồng từ các ca bán vé tiền mặt."
        breadcrumbs={[
          { label: "Admin GoTicket", to: "/admin" },
          { label: "Quyết toán & hoa hồng" },
        ]}
        actions={
          <Button
            variant="outline"
            disabled={loading || busy}
            onClick={() => setRevision((v) => v + 1)}
            className="gap-2 rounded-full"
          >
            <RefreshCcw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Tải lại
          </Button>
        }
      />
      {simulationEnabled && (
        <p
          role="status"
          className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          Chế độ demo: chi trả nhà xe và nộp hoa hồng được mô phỏng trong ứng
          dụng. Số tiền vẫn đối chiếu theo nghiệp vụ; không chuyển tiền ngân
          hàng.
        </p>
      )}
      {simulationError && (
        <p role="alert" className="text-sm text-amber-800">
          {simulationError}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          {notice}
        </p>
      )}
      <SurfaceCard className="overflow-hidden rounded-[28px]">
        <div className="border-b border-[var(--gt-border)] p-5 sm:p-6">
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Loại quyết toán"
          >
            <Button
              variant={tab === "online" ? "default" : "outline"}
              aria-pressed={tab === "online"}
              disabled={busy}
              onClick={() => filter(() => setTab("online"))}
              className="gap-2 rounded-full"
            >
              <ArrowUpRight className="h-4 w-4" />
              Chi trả nhà xe · Online
            </Button>
            <Button
              variant={tab === "cash" ? "default" : "outline"}
              aria-pressed={tab === "cash"}
              disabled={busy}
              onClick={() => filter(() => setTab("cash"))}
              className="gap-2 rounded-full"
            >
              <CreditCard className="h-4 w-4" />
              Thu hoa hồng · Tiền mặt
            </Button>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label
                htmlFor="payout-operator-search"
                className="mb-2 block text-xs font-semibold text-[var(--gt-muted)]"
              >
                Tìm nhà xe
              </label>
              <input
                id="payout-operator-search"
                className={`${field} w-full`}
                value={operatorSearch}
                disabled={busy}
                onChange={(e) => setOperatorSearch(e.target.value)}
                placeholder="Nhập tên nhà xe…"
              />
            </div>
            <div>
              <label
                htmlFor="payout-operator"
                className="mb-2 block text-xs font-semibold text-[var(--gt-muted)]"
              >
                Nhà xe cần xem
              </label>
              <select
                id="payout-operator"
                className={`${field} w-full`}
                disabled={busy}
                value={operatorId}
                onChange={(e) => filter(() => setOperatorId(e.target.value))}
              >
                <option value="">Tất cả nhà xe</option>
                {displayOperators.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.name}
                  </option>
                ))}
              </select>
            </div>
            {tab === "online" && (
              <div>
                <label
                  htmlFor="payout-status"
                  className="mb-2 block text-xs font-semibold text-[var(--gt-muted)]"
                >
                  Trạng thái khoản chi
                </label>
                <select
                  id="payout-status"
                  className={`${field} w-full`}
                  disabled={busy}
                  value={status}
                  onChange={(e) => filter(() => setStatus(e.target.value))}
                >
                  <option value="">Tất cả trạng thái</option>
                  {Object.entries(statuses).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          {operatorError && (
            <p role="alert" className="mt-3 text-sm text-amber-800">
              Chưa tải được tên nhà xe: {operatorError}
            </p>
          )}
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[var(--gt-muted)]">
            {tab === "online"
              ? statuses[status]?.hint ||
                "Mỗi dòng là một khoản chi của đơn vé thanh toán online."
              : "Khách trả tiền tại quầy cho nhà xe. Hệ thống tổng hợp theo ca kế toán đã đóng; Admin xác nhận khoản nộp hoa hồng còn thiếu hoặc mô phỏng để demo."}
          </p>
        </div>
        {error ? (
          <div role="alert" className="p-6 text-sm text-red-700">
            {error}
          </div>
        ) : loading ? (
          <div className="p-10">
            <LoadingState message="Đang tải số liệu quyết toán…" />
          </div>
        ) : (
          <>
            {tab === "cash" && summary && (
              <dl className="grid grid-cols-2 gap-x-5 gap-y-4 border-b border-[var(--gt-border)] p-5 sm:grid-cols-3 sm:p-6 lg:grid-cols-6">
                {[
                  ["Ca đã đối soát", String(summary.shifts)],
                  ["Tiền khách đã trả", money(summary.grossAmount)],
                  ["Đã hoàn khách", money(summary.refundedAmount)],
                  ["Hoa hồng phải thu", money(summary.commissionDue)],
                  ["Đã nộp hoa hồng", money(summary.commissionPaid)],
                  [
                    Number(summary.outstandingAmount) < 0
                      ? "Đã nộp vượt"
                      : "Hoa hồng còn thiếu",
                    money(
                      Number(summary.outstandingAmount) < 0
                        ? String(summary.outstandingAmount).replace("-", "")
                        : summary.outstandingAmount
                    ),
                  ],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-[var(--gt-muted)]">{label}</dt>
                    <dd className="mt-1 text-sm font-semibold text-[var(--gt-ink)] tabular-nums">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
              <h2 className="font-semibold text-[var(--gt-ink)]">
                {tab === "online"
                  ? "Khoản chi trả nhà xe"
                  : "Các ca đã đóng và gửi đối soát"}
              </h2>
              <span className="text-sm text-[var(--gt-muted)]">
                {total.toLocaleString("vi-VN")}{" "}
                {tab === "online" ? "khoản chi" : "ca"}
              </span>
            </div>
            {total === 0 ? (
              <div className="p-8">
                <EmptyState
                  title={
                    tab === "online"
                      ? "Chưa có khoản chi ở trạng thái này"
                      : "Chưa có ca đóng để đối soát"
                  }
                  description={
                    tab === "online"
                      ? "Chọn trạng thái khác hoặc nhà xe khác để xem các khoản đã ghi nhận."
                      : "Ca kế toán tự động xuất hiện khi đã đóng và đồng bộ báo cáo; ca trong ngày có thể chưa đến thời điểm tổng hợp."
                  }
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left text-sm">
                  <thead className="border-y border-[var(--gt-border)] bg-[var(--gt-surface)] text-xs text-[var(--gt-muted)]">
                    <tr>
                      <th className="px-6 py-3 font-medium">
                        {tab === "online"
                          ? "Nhà xe / đơn vé"
                          : "Nhà xe / ca tiền mặt"}
                      </th>
                      <th className="px-4 py-3 font-medium">
                        {tab === "online" ? "Trạng thái" : "Hoa hồng phải thu"}
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        {tab === "online" ? "Tiền thanh toán" : "Đã nộp"}
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        {tab === "online" ? "Hoa hồng sàn" : "Còn phải nộp"}
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        {tab === "online" ? "Trả cho nhà xe" : "Tình trạng"}
                      </th>
                      <th className="px-6 py-3 text-right font-medium">
                        Xử lý
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--gt-border)]">
                    {tab === "online"
                      ? rows.map((row) => (
                          <tr
                            key={row.payoutId}
                            className="align-top hover:bg-[var(--gt-brand-soft)]/30"
                          >
                            <td className="px-6 py-4">
                              <div className="max-w-64 font-semibold text-[var(--gt-ink)]">
                                {byOwner.get(row.hostId) ||
                                  "Nhà xe chưa tải được tên"}
                              </div>
                              <div className="mt-1 flex items-center gap-1 text-xs text-[var(--gt-muted)]">
                                Đơn vé <IdText id={row.orderId} />
                              </div>
                              <p className="mt-1 text-xs text-[var(--gt-muted)]">
                                {time(row.createdAt)}
                              </p>
                            </td>
                            <td className="px-4 py-4">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statuses[row.status]?.className || "bg-slate-100 text-slate-700"}`}
                              >
                                {statuses[row.status]?.label || row.status}
                              </span>
                              {row.settlementSimulated && (
                                <p className="mt-2 text-xs font-medium text-amber-800">
                                  Đã chi trả mô phỏng
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-4 text-right tabular-nums">
                              {money(row.totalAmount)}
                            </td>
                            <td className="px-4 py-4 text-right tabular-nums">
                              {money(row.commissionAmount)}
                              <div className="mt-1 text-xs text-[var(--gt-muted)]">
                                {Number(row.commissionRate) * 100}%
                              </div>
                            </td>
                            <td className="px-4 py-4 text-right font-semibold tabular-nums">
                              {money(row.hostAmount)}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={busy}
                                  onClick={() => setDetail(row)}
                                  className="rounded-full"
                                >
                                  Chi tiết
                                </Button>
                                {row.status === "REQUESTED" &&
                                  simulationEnabled && (
                                    <SettlementSimulationButton
                                      kind="online"
                                      id={row.payoutId}
                                      disabled={busy}
                                      onCompleted={completedSimulation}
                                    />
                                  )}
                                {row.status === "REQUESTED" && (
                                  <Button
                                    size="sm"
                                    disabled={busy}
                                    onClick={() =>
                                      void openProof({ kind: "online", row })
                                    }
                                    variant="outline"
                                    className="rounded-full"
                                  >
                                    {simulationEnabled
                                      ? "Chứng từ thật"
                                      : "Ghi nhận chi trả"}
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      : shifts.map((row) => (
                          <tr
                            key={row.shiftId}
                            className="align-top hover:bg-[var(--gt-brand-soft)]/30"
                          >
                            <td className="px-6 py-4">
                              <div className="max-w-64 font-semibold">
                                {byId.get(row.operatorId) ||
                                  "Nhà xe chưa tải được tên"}
                              </div>
                              <div className="mt-1 flex items-center gap-1 text-xs text-[var(--gt-muted)]">
                                Ca <IdText id={row.shiftId} />
                              </div>
                              <p className="mt-1 text-xs text-[var(--gt-muted)]">
                                {time(row.recordedAt)}
                              </p>
                            </td>
                            <td className="px-4 py-4 tabular-nums">
                              {money(row.commissionDue)}
                              <p className="mt-1 text-xs text-[var(--gt-muted)]">
                                Tỷ lệ {Number(row.commissionRate) * 100}%
                              </p>
                            </td>
                            <td className="px-4 py-4 text-right tabular-nums">
                              {money(row.commissionPaid)}
                              {row.settlementSimulated && (
                                <p className="mt-2 text-xs font-medium text-amber-800">
                                  Mô phỏng: {money(row.simulationAmount)}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-4 text-right tabular-nums">
                              {money(row.outstandingAmount)}
                            </td>
                            <td className="px-4 py-4 text-right text-xs">
                              {Number(row.outstandingAmount) < 0
                                ? "Đã nộp vượt, cần đối chiếu"
                                : Number(row.outstandingAmount) === 0 &&
                                    row.paymentRecorded
                                  ? row.settlementSimulated
                                    ? "Đã nộp · Có mô phỏng"
                                    : "Đã ghi nhận chứng từ"
                                  : Number(row.commissionDue) === 0
                                    ? "Không phải nộp"
                                    : "Chờ nhà xe nộp"}
                            </td>
                            <td className="px-6 py-4 text-right">
                              {Number(row.outstandingAmount) > 0 &&
                                simulationEnabled && (
                                  <SettlementSimulationButton
                                    kind="cash"
                                    id={row.shiftId}
                                    disabled={busy}
                                    onCompleted={completedSimulation}
                                  />
                                )}
                              {!row.paymentRecorded &&
                                Number(row.commissionDue) > 0 && (
                                  <Button
                                    size="sm"
                                    disabled={busy}
                                    onClick={() =>
                                      void openProof({ kind: "cash", row })
                                    }
                                    variant="outline"
                                    className="rounded-full"
                                  >
                                    {simulationEnabled
                                      ? "Chứng từ thật"
                                      : "Ghi nhận đã nộp"}
                                  </Button>
                                )}
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="px-5 pb-5 sm:px-6">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={total}
                onPageChange={setPage}
                disabled={busy || loading}
              />
            </div>
          </>
        )}
      </SurfaceCard>
      <TransportCommissionSettings />
      <Dialog
        open={detail !== null}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
      >
        <DialogContent className="max-w-lg rounded-[28px]">
          <DialogHeader>
            <DialogTitle>Chi tiết khoản chi</DialogTitle>
            <DialogDescription>
              {detail && (byOwner.get(detail.hostId) || "Nhà xe")}
            </DialogDescription>
          </DialogHeader>
          {detail && (
            <dl className="space-y-3 text-sm">
              {[
                ["Mã khoản chi", detail.payoutId],
                ["Mã đơn vé", detail.orderId],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-3"
                >
                  <dt>{label}</dt>
                  <dd>
                    <IdText id={value} />
                  </dd>
                </div>
              ))}
              <div className="flex justify-between">
                <dt>Trạng thái</dt>
                <dd>
                  {detail.settlementSimulated
                    ? "Đã chi trả mô phỏng"
                    : statuses[detail.status]?.label || detail.status}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt>Tiền thanh toán</dt>
                <dd>{money(detail.totalAmount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Hoa hồng đã chốt</dt>
                <dd>
                  {money(detail.commissionAmount)} (
                  {Number(detail.commissionRate) * 100}%)
                </dd>
              </div>
              <div className="flex justify-between border-t pt-3 font-semibold">
                <dt>Trả cho nhà xe</dt>
                <dd>{money(detail.hostAmount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Ngày chi trả</dt>
                <dd>{time(detail.paidAt)}</dd>
              </div>
            </dl>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDetail(null)}
              className="rounded-full"
            >
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={proof !== null}
        onOpenChange={(open) => {
          if (!busy && !open) setProof(null);
        }}
      >
        <DialogContent className="max-w-lg rounded-[28px]">
          <DialogHeader>
            <DialogTitle>
              {proof?.kind === "cash"
                ? "Ghi nhận nhà xe nộp hoa hồng"
                : "Ghi nhận chi trả nhà xe"}
            </DialogTitle>
            <DialogDescription>
              Lưu mã giao dịch và chứng từ của khoản tiền đã chuyển.
            </DialogDescription>
          </DialogHeader>
          {proof && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-[var(--gt-brand-soft)] p-4">
                <p className="text-xs text-[var(--gt-muted)]">
                  Số tiền đã đối chiếu
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums">
                  {money(
                    proof.kind === "online"
                      ? proof.row.hostAmount
                      : proof.row.commissionDue
                  )}
                </p>
                <p className="mt-1 text-sm">
                  {proof.kind === "online"
                    ? byOwner.get(proof.row.hostId)
                    : byId.get(proof.row.operatorId)}
                </p>
              </div>
              <div>
                <label
                  htmlFor="settlement-reference"
                  className="mb-2 block text-sm font-semibold"
                >
                  Mã giao dịch
                </label>
                <input
                  id="settlement-reference"
                  className={`${field} w-full`}
                  value={reference}
                  disabled={busy}
                  maxLength={160}
                  onChange={(e) => setReference(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div>
                <label
                  htmlFor="settlement-evidence"
                  className="mb-2 block text-sm font-semibold"
                >
                  Đường dẫn chứng từ (HTTPS)
                </label>
                <input
                  id="settlement-evidence"
                  className={`${field} w-full`}
                  type="url"
                  value={evidence}
                  disabled={busy}
                  maxLength={1000}
                  onChange={(e) => setEvidence(e.target.value)}
                  placeholder="https://…"
                />
              </div>
              {dialogError && (
                <p role="alert" className="text-sm text-red-700">
                  {dialogError}
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setProof(null)}
              className="rounded-full"
            >
              Đóng
            </Button>
            <Button
              disabled={busy || !reference.trim() || !evidence.trim()}
              onClick={() => void recordProof()}
              className="gap-2 rounded-full"
            >
              <ReceiptText className="h-4 w-4" />
              {busy ? "Đang lưu…" : "Lưu chứng từ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
