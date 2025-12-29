import { Star, CheckCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

interface ReviewCardProps {
  review: {
    id: string;
    rating: number;
    comment: string | null;
    created_at: string | null;
    user_id: string;
  };
  isVerifiedBuyer?: boolean;
}

const ReviewCard = ({ review, isVerifiedBuyer = true }: ReviewCardProps) => {
  const timeAgo = review.created_at
    ? formatDistanceToNow(new Date(review.created_at), {
        addSuffix: true,
        locale: ptBR,
      })
    : "";

  return (
    <div className="bg-card border border-border rounded-xl p-5 transition-all duration-200 hover:border-primary/30 hover:shadow-sm animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {/* Rating */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map(star => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${
                    star <= review.rating
                      ? "fill-accent text-accent"
                      : "text-muted"
                  }`}
                />
              ))}
            </div>
            {isVerifiedBuyer && (
              <Badge variant="outline" className="text-xs gap-1 text-primary border-primary/30">
                <CheckCircle className="h-3 w-3" />
                Compra verificada
              </Badge>
            )}
          </div>

          {/* Comment */}
          {review.comment ? (
            <p className="text-foreground leading-relaxed">{review.comment}</p>
          ) : (
            <p className="text-muted-foreground italic text-sm">
              Sem comentário
            </p>
          )}
        </div>
      </div>

      {/* Time */}
      <p className="text-xs text-muted-foreground mt-4">{timeAgo}</p>
    </div>
  );
};

export default ReviewCard;
