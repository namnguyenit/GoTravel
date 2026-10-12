import React from 'react';
import { CheckCircle2, Clock, AlertCircle, Loader2 } from 'lucide-react';

export interface OperationStep {
  title: string;
  description?: string;
  timestamp?: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';
}

export interface OperationTimelineProps {
  steps?: OperationStep[];
  currentState?: string;
  kind?: string;
  className?: string;
}

export const OperationTimeline: React.FC<OperationTimelineProps> = ({
  steps,
  currentState,
  kind,
  className = '',
}) => {
  // If steps are not explicitly passed, derive them from currentState and kind
  const resolvedSteps: OperationStep[] = React.useMemo(() => {
    if (steps && steps.length > 0) return steps;

    const isExchange = kind === 'EXCHANGE';
    const state = currentState || 'PREPARED';

    const baseFlow = isExchange
      ? [
          { key: 'PREPARED', title: 'Tiếp nhận yêu cầu đổi vé' },
          { key: 'HELD', title: 'Khóa giữ chỗ chuyến xe mới' },
          { key: 'WAITING_FUNDS', title: 'Thanh toán khoản chênh lệch' },
          { key: 'COMMITTING', title: 'Xác nhận thay đổi vé' },
          { key: 'COMPLETED', title: 'Phát hành vé mới hoàn tất' },
        ]
      : [
          { key: 'PREPARED', title: 'Tiếp nhận yêu cầu hủy vé' },
          { key: 'SETTLING', title: 'Đối soát chính sách hoàn tiền' },
          { key: 'COMPLETED', title: 'Hủy vé và hoàn tất xử lý' },
        ];

    const isAborted = state.includes('ABORT');
    const isCompleted = state === 'COMPLETED';

    const orderIndexMap: Record<string, number> = {
      PREPARED: 0,
      HELD: 1,
      WAITING_FUNDS: 2,
      COMMITTING: 3,
      TICKET_COMMITTED: 3,
      SETTLING: 3,
      COMPLETED: 4,
      REFUND_PENDING: 4,
    };

    const currentIdx = orderIndexMap[state] ?? 0;

    return baseFlow.map((step, idx) => {
      let status: OperationStep['status'] = 'PENDING';
      if (isAborted) {
        status = idx === currentIdx ? 'FAILED' : idx < currentIdx ? 'SUCCESS' : 'PENDING';
      } else if (isCompleted || idx < currentIdx) {
        status = 'SUCCESS';
      } else if (idx === currentIdx) {
        status = 'RUNNING';
      } else {
        status = 'PENDING';
      }

      return {
        title: step.title,
        status,
      };
    });
  }, [steps, currentState, kind]);

  return (
    <div className={`space-y-4 ${className}`}>
      {resolvedSteps.map((step, idx) => {
        const isSuccess = step.status === 'SUCCESS';
        const isRunning = step.status === 'RUNNING';
        const isFailed = step.status === 'FAILED';

        const icon = isSuccess ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        ) : isRunning ? (
          <Loader2 className="w-5 h-5 text-[#FF385C] animate-spin" />
        ) : isFailed ? (
          <AlertCircle className="w-5 h-5 text-rose-500" />
        ) : (
          <Clock className="w-5 h-5 text-gray-300" />
        );

        return (
          <div key={idx} className="flex items-start gap-3.5">
            <div className="shrink-0 mt-0.5">{icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className={`text-sm font-bold ${
                    isSuccess
                      ? 'text-gray-900'
                      : isRunning
                      ? 'text-[#FF385C]'
                      : isFailed
                      ? 'text-rose-600'
                      : 'text-gray-400'
                  }`}
                >
                  {step.title}
                </span>
                {step.timestamp && (
                  <span className="text-[11px] text-gray-400 tabular-nums">
                    {step.timestamp}
                  </span>
                )}
              </div>
              {step.description && (
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  {step.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
