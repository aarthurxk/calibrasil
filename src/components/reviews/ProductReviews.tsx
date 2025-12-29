import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import RatingDistribution from "./RatingDistribution";
import ReviewCard from "./ReviewCard";
import ReviewForm from "./ReviewForm";
import { Skeleton } from "@/components/ui/skeleton";

interface ProductReviewsProps {
  productId: string;
}

const ProductReviews = ({ productId }: ProductReviewsProps) => {
  const { user } = useAuth();

  // Fetch approved reviews
  const {
    data: reviews = [],
    isLoading,
    refetch: refetchReviews,
  } = useQuery({
    queryKey: ["product-reviews", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_reviews")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!productId,
  });

  // Check if user can review (has purchased and received the product)
  const { data: canReview = false, isLoading: canReviewLoading } = useQuery({
    queryKey: ["can-review", productId, user?.id],
    queryFn: async () => {
      if (!productId || !user?.id) return false;

      // Check if user already reviewed this product
      const { data: existingReview } = await supabase
        .from("product_reviews")
        .select("id")
        .eq("product_id", productId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingReview) return false;

      // Check if user has a delivered order with this product
      const { data: orders } = await supabase
        .from("orders")
        .select("id")
        .eq("user_id", user.id)
        .or("status.eq.delivered,received_at.not.is.null");

      if (!orders || orders.length === 0) return false;

      const orderIds = orders.map(o => o.id);
      const { data: orderItems } = await supabase
        .from("order_items")
        .select("id")
        .eq("product_id", productId)
        .in("order_id", orderIds);

      return (orderItems?.length ?? 0) > 0;
    },
    enabled: !!productId && !!user?.id,
  });

  // Calculate average rating
  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div id="reviews" className="space-y-8">
      <h2 className="text-2xl font-bold">
        Avaliações{" "}
        <span className="text-muted-foreground font-normal">
          ({reviews.length})
        </span>
      </h2>

      {/* Rating Distribution */}
      {reviews.length > 0 && (
        <RatingDistribution
          reviews={reviews}
          averageRating={averageRating}
          totalReviews={reviews.length}
        />
      )}

      {/* Review Form */}
      <ReviewForm
        productId={productId}
        userId={user?.id}
        canReview={canReview && !canReviewLoading}
        onReviewSubmitted={refetchReviews}
      />

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Ainda não tem avaliações. Seja o primeiro! 🏄</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map(review => (
            <ReviewCard key={review.id} review={review} isVerifiedBuyer />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductReviews;
