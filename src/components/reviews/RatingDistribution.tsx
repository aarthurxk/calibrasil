import { Star } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface RatingDistributionProps {
  reviews: { rating: number }[];
  averageRating: number;
  totalReviews: number;
}

const RatingDistribution = ({ reviews, averageRating, totalReviews }: RatingDistributionProps) => {
  // Calculate distribution
  const distribution = [5, 4, 3, 2, 1].map(star => {
    const count = reviews.filter(r => r.rating === star).length;
    const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
    return { star, count, percentage };
  });

  return (
    <div className="bg-card border border-border rounded-2xl p-6 animate-fade-in">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Average Rating */}
        <div className="flex flex-col items-center justify-center md:min-w-[140px]">
          <span className="text-5xl font-bold text-foreground">
            {averageRating.toFixed(1)}
          </span>
          <div className="flex items-center gap-1 mt-2">
            {[1, 2, 3, 4, 5].map(star => (
              <Star
                key={star}
                className={`h-5 w-5 ${
                  star <= Math.round(averageRating)
                    ? "fill-accent text-accent"
                    : "text-muted"
                }`}
              />
            ))}
          </div>
          <span className="text-sm text-muted-foreground mt-2">
            {totalReviews} {totalReviews === 1 ? "avaliação" : "avaliações"}
          </span>
        </div>

        {/* Distribution Bars */}
        <div className="flex-1 space-y-3">
          {distribution.map(({ star, count, percentage }) => (
            <div key={star} className="flex items-center gap-3">
              <span className="text-sm font-medium w-4">{star}</span>
              <Star className="h-4 w-4 fill-accent text-accent" />
              <Progress 
                value={percentage} 
                className="flex-1 h-2 bg-muted"
              />
              <span className="text-sm text-muted-foreground w-8 text-right">
                {count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RatingDistribution;
