import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { httpClient } from '@/shared/infrastructure/http/HttpPort';
import {
  PageHeader,
  MetricCard,
  SurfaceCard,
  Button,
} from '@/shared/presentation/components';
import {
  Building2,
  CalendarDays,
  FileCheck2,
  AlertOctagon,
  Scale,
  ArrowRight,
  TrendingUp,
  Receipt,
  FileText,
  CreditCard,
  Layers,
} from 'lucide-react';
import { formatVnd } from '@/shared/domain/money.vo';

interface TransportStats {
  totalOperators: number;
  pendingApplications: number;
  totalTransportOrders: number;
  attentionItems: number;
  totalRevenueVnd: number;
}

export const AdminTransportOverviewPage: React.FC = () => {
  const [stats, setStats] = useState<TransportStats>({
    totalOperators: 0,
    pendingApplications: 0,
    totalTransportOrders: 0,
    attentionItems: 0,
    totalRevenueVnd: 0,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const fetchOverview = async () => {
      try {
        setLoading(true);

        setError('');
        const [apps, operators, counts] = await Promise.all([
          httpClient.get<any>('/api/v1/admin/ticket-vendors', {
            params: { status: 'PENDING', page: 0, size: 1 },
          }),
          httpClient.get<any>('/api/v1/operators', {
            params: { page: 1, limit: 1 },
          }),
          httpClient.get<Record<string, number>>(
            '/api/v1/orders/transport/admin/summary',
          ),
        ]);
        if (!isMounted) return;
        setStats({
          totalOperators: Number(operators.pagination?.total ?? 0),
          pendingApplications: Number(apps.totalElements ?? 0),
          totalTransportOrders: counts.ALL ?? 0,
          attentionItems: counts.ATTENTION ?? 0,
          totalRevenueVnd: 0,
        });
      } catch (e) {
        if (isMounted)
          setError(
            e instanceof Error ? e.message : 'Không tải được số liệu quản trị.',
          );
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void fetchOverview();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Editorial Page Header */}
      <PageHeader
        title="Vận tải GoTicket · Tổng quan"
        eyebrow="Trung tâm Điều hành Nền tảng"
        description="Giám sát mạng lưới nhà xe, phê duyệt hồ sơ đối tác KYC, kiểm soát giao dịch vé và xử lý các ngoại lệ vận hành."
        breadcrumbs={[
          { label: 'Admin GoTicket', to: '/admin' },
          { label: 'Tổng quan' },
        ]}
        actions={
          <Button
            asChild
            variant="default"
            className="rounded-full bg-[#FF385C] hover:bg-[#E61E4F] text-white shadow-coral-sm px-5 py-2.5 font-bold text-xs"
          >
            <Link to="/admin/applications" className="gap-2 flex items-center">
              <FileCheck2 className="w-4 h-4" />
              <span>
                Duyệt hồ sơ (
                {loading || error ? '—' : stats.pendingApplications})
              </span>
            </Link>
          </Button>
        }
      />

      {error && (
        <p
          role="alert"
          className="rounded-2xl border border-red-200 p-4 text-red-700"
        >
          {error} Số liệu chưa được xác nhận; vui lòng tải lại trang.
        </p>
      )}
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <MetricCard
          label="Hồ sơ chờ duyệt"
          value={loading || error ? '—' : stats.pendingApplications}
          subtext="Hồ sơ đăng ký nhà xe mới"
          icon={FileCheck2}
          variant="coral"
        />

        <MetricCard
          label="Nhà xe đối tác"
          value={loading || error ? '—' : stats.totalOperators}
          subtext="Doanh nghiệp vận tải đã liên kết"
          icon={Building2}
          variant="default"
        />

        <MetricCard
          label="Đơn vé xe toàn hệ thống"
          value={
            loading || error
              ? '—'
              : stats.totalTransportOrders.toLocaleString('vi-VN')
          }
          subtext="Toàn bộ lịch sử đơn GoTicket, không phải số chuyến"
          icon={TrendingUp}
          variant="emerald"
        />

        <MetricCard
          label="Đơn vé cần can thiệp"
          value={loading || error ? '—' : stats.attentionItems}
          subtext="Đơn rà soát tiền, hoàn tiền và đồng bộ chậm"
          icon={AlertOctagon}
          variant={stats.attentionItems > 0 ? 'coral' : 'default'}
        />
      </div>

      {/* Operations Quick Modules */}
      <div>
        <div className="mb-5">
          <h2 className="text-xl font-black text-[var(--gt-ink)] tracking-tight">
            Phân hệ Quản trị & Vận hành
          </h2>
          <p className="text-xs text-[var(--gt-muted)] mt-1">
            Truy cập nhanh vào các tính năng điều hành hệ sinh thái vé xe
            GoTicket
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <SurfaceCard className="p-6 sm:p-7 rounded-[28px] flex flex-col justify-between hover:border-[var(--gt-coral)]/40 transition-all hover:shadow-glass-lg hover:-translate-y-1 group">
            <div className="space-y-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[var(--gt-coral-soft)]/80 text-[var(--gt-coral)] flex items-center justify-center transition-transform group-hover:scale-105 shadow-xs">
                <Building2 className="w-5.5 h-5.5" />
              </div>
              <h3 className="font-bold text-base text-[var(--gt-ink)] group-hover:text-[var(--gt-coral)] transition-colors">
                Nhà xe & Trạng thái hoạt động
              </h3>
              <p className="text-xs text-[var(--gt-muted)] leading-relaxed">
                Xem toàn bộ {stats.totalOperators} nhà xe đối tác, tạm đình chỉ
                vi phạm hoặc kích hoạt lại sau kiểm tra chất lượng.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-[var(--gt-border)]/60">
              <Link
                to="/admin/operators"
                className="inline-flex items-center justify-between w-full rounded-full px-4 py-2 bg-stone-100/70 hover:bg-[var(--gt-coral)] text-stone-700 hover:text-white transition-all text-xs font-bold group-hover:shadow-xs"
              >
                <span>Mở quản lý nhà xe</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </SurfaceCard>

          <SurfaceCard className="p-6 sm:p-7 rounded-[28px] flex flex-col justify-between hover:border-[var(--gt-coral)]/40 transition-all hover:shadow-glass-lg hover:-translate-y-1 group">
            <div className="space-y-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[var(--gt-coral-soft)]/80 text-[var(--gt-coral)] flex items-center justify-center transition-transform group-hover:scale-105 shadow-xs">
                <Receipt className="w-5.5 h-5.5" />
              </div>
              <h3 className="font-bold text-base text-[var(--gt-ink)] group-hover:text-[var(--gt-coral)] transition-colors">
                Đơn hàng & Ngoại lệ tranh chấp
              </h3>
              <p className="text-xs text-[var(--gt-muted)] leading-relaxed">
                Tra cứu đơn hàng chéo nhà xe, duyệt hoàn tiền, xử lý yêu cầu hủy
                vé hoặc can thiệp sự cố vận hành phát sinh.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-[var(--gt-border)]/60">
              <Link
                to="/admin/orders"
                className="inline-flex items-center justify-between w-full rounded-full px-4 py-2 bg-stone-100/70 hover:bg-[var(--gt-coral)] text-stone-700 hover:text-white transition-all text-xs font-bold group-hover:shadow-xs"
              >
                <span>Tra cứu đơn hàng</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </SurfaceCard>

          <SurfaceCard className="p-6 sm:p-7 rounded-[28px] flex flex-col justify-between hover:border-[var(--gt-coral)]/40 transition-all hover:shadow-glass-lg hover:-translate-y-1 group">
            <div className="space-y-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[var(--gt-coral-soft)]/80 text-[var(--gt-coral)] flex items-center justify-center transition-transform group-hover:scale-105 shadow-xs">
                <Scale className="w-5.5 h-5.5" />
              </div>
              <h3 className="font-bold text-base text-[var(--gt-ink)] group-hover:text-[var(--gt-coral)] transition-colors">
                Trung tâm Vận hành Admin
              </h3>
              <p className="text-xs text-[var(--gt-muted)] leading-relaxed">
                Xử lý hoàn tiền, hủy chuyến, đối soát doanh thu và hoa hồng.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-[var(--gt-border)]/60">
              <Link
                to="/admin/reconciliation"
                className="inline-flex items-center justify-between w-full rounded-full px-4 py-2 bg-stone-100/70 hover:bg-[var(--gt-coral)] text-stone-700 hover:text-white transition-all text-xs font-bold group-hover:shadow-xs"
              >
                <span>Mở trung tâm vận hành</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
};
