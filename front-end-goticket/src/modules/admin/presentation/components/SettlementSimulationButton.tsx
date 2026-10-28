import { useEffect, useRef, useState } from "react";
import { FlaskConical } from "lucide-react";
import { httpClient } from "@/shared/infrastructure/http/HttpPort";
import { Button, MoneyText } from "@/shared/presentation/components";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Result = {
  id: string;
  state: "READY" | "COMPLETED";
  simulated: boolean;
  amount: string;
  reference?: string;
  message: string;
};
export function SettlementSimulationButton({
  kind,
  id,
  disabled,
  onCompleted,
}: {
  kind: "online" | "cash";
  id: string;
  disabled?: boolean;
  onCompleted: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const busy = useRef(false);
  const sequence = useRef(0);
  const endpoint =
    kind === "online"
      ? `/api/v1/payouts/transport/${id}`
      : `/api/v1/payouts/transport/cash-settlements/${id}`;
  const completedRef = useRef(onCompleted);
  completedRef.current = onCompleted;
  useEffect(() => {
    if (!open) return;
    const current = ++sequence.current;
    setLoading(true);
    setError("");
    setData(null);
    httpClient
      .post<Result>(`${endpoint}/simulation-preview`)
      .then((result) => {
        if (current !== sequence.current) return;
        if (result.state === "COMPLETED") {
          setOpen(false);
          completedRef.current(result.message);
        } else setData(result);
      })
      .catch((failure) => {
        if (current === sequence.current)
          setError(
            failure instanceof Error
              ? failure.message
              : "Chưa đối chiếu được số tiền. Đóng và thử lại."
          );
      })
      .finally(() => {
        if (current === sequence.current) setLoading(false);
      });
    return () => {
      sequence.current++;
    };
  }, [open, endpoint]);
  const confirm = async () => {
    if (!data || data.state !== "READY" || busy.current) return;
    busy.current = true;
    setSending(true);
    setError("");
    try {
      const result = await httpClient.post<Result>(
        `${endpoint}/simulate-paid`,
        { amount: String(data.amount).replace(/\.0+$/, "") }
      );
      if (result.state !== "COMPLETED" || !result.simulated)
        throw new Error(
          "Chưa xác nhận được kết quả. Đóng và kiểm tra lại trước khi thao tác khác."
        );
      setOpen(false);
      completedRef.current(result.message);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Chưa ghi nhận được kết quả mô phỏng."
      );
    } finally {
      busy.current = false;
      setSending(false);
    }
  };
  return (
    <>
      <Button
        size="sm"
        className="min-h-9 rounded-full bg-[#D91D45] text-white hover:bg-[#BD1639]"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <FlaskConical aria-hidden="true" />
        {kind === "online" ? "Chi trả mô phỏng" : "Nộp mô phỏng"}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!busy.current) setOpen(value);
        }}
      >
        <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {kind === "online"
                ? "Xác nhận chi trả mô phỏng"
                : "Xác nhận nộp hoa hồng mô phỏng"}
            </DialogTitle>
            <DialogDescription>
              {kind === "online"
                ? "Ghi nhận nhà xe đã nhận khoản quyết toán để demo luồng rút tiền."
                : "Ghi nhận nhà xe đã nộp phần hoa hồng còn thiếu để demo đối soát tiền mặt."}{" "}
              Không chuyển tiền ngân hàng.
            </DialogDescription>
          </DialogHeader>
          {loading && (
            <p role="status" className="py-4 text-sm text-stone-600">
              Đang đối chiếu số tiền và điều kiện quyết toán…
            </p>
          )}
          {data && (
            <>
              <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-stone-200 py-4">
                <span className="text-sm">
                  {kind === "online" ? "Nhà xe nhận" : "Hoa hồng còn phải nộp"}
                </span>
                <MoneyText
                  amount={String(data.amount)}
                  className="text-xl font-bold"
                />
              </div>
              <p className="text-sm text-stone-600">{data.message}</p>
              <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950">
                Kết quả sẽ có nhãn mô phỏng trong lịch sử. Không cần nhập mã
                chuyển khoản hoặc tải chứng từ giả.
              </p>
            </>
          )}
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button
              variant="outline"
              disabled={sending}
              onClick={() => setOpen(false)}
            >
              Đóng
            </Button>
            {data && (
              <Button
                className="bg-[#D91D45] text-white hover:bg-[#BD1639]"
                disabled={loading || sending}
                onClick={() => void confirm()}
              >
                {sending ? "Đang ghi nhận…" : "Xác nhận mô phỏng"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
