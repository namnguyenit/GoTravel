import { useEffect, useState } from 'react';
import { httpClient } from '@/shared/infrastructure/http/HttpPort';
import { DateVo } from '@/shared/domain/date.vo';
import { QrCodeView } from '@/shared/presentation/components/QrCodeView';
import { Button, InlineAlert, LoadingState } from '@/shared/presentation/components';

type Document = {
  itemId: string;
  orderNumber: string;
  passengerName: string;
  routeTitle: string;
  seatCode: string;
  departureAt: string;
  revision: number;
  checkInToken: string;
};

/** QR documents are fetched only through the protected SELL_CASH endpoint. */
export function CashTicketDocuments({ orderId }: { orderId: string }) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setDocuments([]); setError('');
    void (async () => {
      try {
        const order = await httpClient.get<{ items: { itemId: string; transportItemState: string }[] }>(
          `/api/v1/orders/transport/vendor/${orderId}`, { signal: controller.signal },
        );
        const active = order.items.filter(item => item.transportItemState === 'ACTIVE');
        const docs = await Promise.all(active.map(item => httpClient.get<Document>(
          `/api/v1/orders/transport/vendor/${orderId}/items/${item.itemId}/ticket-document`, { signal: controller.signal },
        )));
        if (!controller.signal.aborted) setDocuments(docs);
      } catch (reason) {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Không tải được vé điện tử để in.');
      } finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => controller.abort();
  }, [orderId, attempt]);

  return <section className="space-y-4 text-left" aria-label="Vé điện tử tại quầy">
    <h3 className="text-base font-bold">Vé điện tử tại quầy</h3>
    {loading ? <LoadingState message="Đang lấy chứng từ vé và mã QR…" /> : error ? <>
      <InlineAlert variant="error" title="Chưa tải được vé để in" message={error} />
      <Button type="button" variant="outline" onClick={() => setAttempt(value => value + 1)}>Tải lại vé điện tử</Button>
    </> : !documents.length ? <p className="text-sm text-muted">Đơn không còn vé đang hoạt động để in.</p> : <>
      {documents.map(document => <article key={document.itemId} className="flex flex-wrap items-center justify-between gap-5 rounded-2xl border bg-white p-5 print:break-inside-avoid">
        <div className="space-y-2 text-sm">
          <h4 className="font-bold">{document.routeTitle}</h4>
          <p>Đơn vé: {document.orderNumber}</p>
          <p>Hành khách: <strong>{document.passengerName}</strong></p>
          <p>Ghế: <strong>{document.seatCode}</strong> · Phiên bản {document.revision}</p>
          <p>Khởi hành: {DateVo.formatVietnamDateTime(document.departureAt)}</p>
        </div>
        <div role="img" aria-label={`Mã QR vé ghế ${document.seatCode}`}><QrCodeView value={document.checkInToken} size={160} /></div>
      </article>)}
      <Button type="button" variant="outline" onClick={() => window.print()} className="print:hidden">In vé & Biên lai</Button>
    </>}
  </section>;
}
