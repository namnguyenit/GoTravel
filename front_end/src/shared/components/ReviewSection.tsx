import React, { useEffect, useState } from 'react';
import { Star, MessageSquare } from 'lucide-react';
import ServiceServices from '@/services/service';
import OrderService from '@/services/order';
import AuthService from '@/services/auth.service';
import ReviewModal from './ReviewModal';

interface Review {
  id: string;
  userId: string;
  rating: number;
  comment: string;
  images: string[];
  createdAt: string;
}

interface ReviewSectionProps {
  listingId: string;
}

export default function ReviewSection({ listingId }: ReviewSectionProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [canReview, setCanReview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    setIsLoggedIn(AuthService.isAuthenticated());
  }, []);

  const fetchReviews = async () => {
    try {
      const res = await ServiceServices.getReviews(listingId);
      if (res?.data?.content) {
        setReviews(res.data.content);
      }
    } catch (error) {
      console.error("Failed to fetch reviews", error);
    }
  };

  const checkEligibility = async () => {
    if (!isLoggedIn) return;
    try {
      const res = await OrderService.checkPurchased(listingId);
      if (res?.data === true) {
        setCanReview(true);
      }
    } catch (error) {
      console.error("Failed to check review eligibility", error);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchReviews();
      if (isLoggedIn) {
        await checkEligibility();
      }
      setLoading(false);
    };
    init();
  }, [listingId, isLoggedIn]);

  return (
    <div className="py-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-app-fg flex items-center gap-2">
          <MessageSquare className="w-6 h-6" />
          Đánh giá từ khách hàng
        </h2>
        {canReview && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-2 bg-app-primary hover:bg-app-primary/90 text-white font-medium rounded-full transition-colors"
          >
            Viết đánh giá
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full"></div>
        </div>
      ) : reviews.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reviews.map((review) => (
            <div key={review.id} className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-brand-100 text-brand-600 dark:bg-brand-900 dark:text-brand-300 rounded-full flex items-center justify-center font-bold text-lg">
                  {review.userId.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-app-fg">Khách hàng</div>
                  <div className="text-sm text-app-muted-fg">
                    {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                  </div>
                </div>
              </div>
              <div className="flex gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`w-4 h-4 ${i < review.rating ? 'fill-amber-500 text-amber-500' : 'fill-zinc-200 text-zinc-200 dark:fill-zinc-800 dark:text-zinc-800'}`} 
                  />
                ))}
              </div>
              <p className="text-app-fg leading-relaxed">
                {review.comment}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
          <MessageSquare className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
          <p className="text-app-muted-fg">Chưa có đánh giá nào cho dịch vụ này.</p>
        </div>
      )}

      <ReviewModal 
        listingId={listingId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          fetchReviews(); // Reload after submit
        }}
      />
    </div>
  );
}
