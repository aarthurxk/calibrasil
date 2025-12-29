import { useState } from "react";
import { Star, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ReviewFormProps {
  productId: string;
  userId: string | undefined;
  canReview: boolean;
  onReviewSubmitted: () => void;
}

const ReviewForm = ({ productId, userId, canReview, onReviewSubmitted }: ReviewFormProps) => {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const displayRating = hoverRating || rating;

  const getRatingLabel = (r: number) => {
    const labels: Record<number, string> = {
      1: "Péssimo",
      2: "Ruim",
      3: "Regular",
      4: "Bom",
      5: "Excelente!",
    };
    return labels[r] || "";
  };

  const handleSubmit = async () => {
    if (!userId || !productId) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("product_reviews").insert({
        product_id: productId,
        user_id: userId,
        rating: rating,
        comment: comment.trim() || null,
        approved: true, // Auto-approve for now
      });

      if (error) throw error;

      setSubmitted(true);
      toast.success("Avaliação enviada! Valeu! 🌴");
      onReviewSubmitted();
    } catch (error) {
      console.error("Review error:", error);
      toast.error("Erro ao enviar avaliação");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state
  if (submitted) {
    return (
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-8 text-center animate-scale-in">
        <CheckCircle className="h-12 w-12 text-primary mx-auto mb-4" />
        <h3 className="font-semibold text-lg mb-2">Obrigado pela sua avaliação!</h3>
        <p className="text-muted-foreground">
          Sua opinião nos ajuda a melhorar cada vez mais! 🌴
        </p>
      </div>
    );
  }

  // Not logged in
  if (!userId) {
    return (
      <div className="bg-muted/30 border border-border rounded-2xl p-8 text-center">
        <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-semibold text-lg mb-2">Faça login para avaliar</h3>
        <p className="text-muted-foreground mb-4">
          Você precisa estar logado para avaliar produtos.
        </p>
        <Button asChild>
          <Link to="/auth">Entrar na Conta</Link>
        </Button>
      </div>
    );
  }

  // Can't review (didn't receive order)
  if (!canReview) {
    return (
      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-6 text-center">
        <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-3" />
        <h3 className="font-semibold mb-2">Confirme o recebimento antes de avaliar</h3>
        <p className="text-muted-foreground text-sm">
          Para avaliar este produto, você precisa ter comprado e confirmado o recebimento do pedido.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6 animate-fade-in">
      <h3 className="font-semibold text-lg mb-1">Avalie este produto</h3>
      <p className="text-sm text-muted-foreground mb-6">
        Conta pra gente o que você achou! Sua avaliação ajuda outros clientes. 🌴
      </p>

      <div className="space-y-6">
        {/* Star Rating */}
        <div>
          <label className="block text-sm font-medium mb-3">Sua nota</label>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      "h-8 w-8 transition-colors duration-150",
                      star <= displayRating
                        ? "fill-accent text-accent"
                        : "text-muted hover:text-accent/50"
                    )}
                  />
                </button>
              ))}
            </div>
            <span className="text-sm text-muted-foreground ml-2">
              {getRatingLabel(displayRating)}
            </span>
          </div>
        </div>

        {/* Comment */}
        <div>
          <label className="block text-sm font-medium mb-3">
            Seu comentário <span className="text-muted-foreground font-normal">(opcional)</span>
          </label>
          <Textarea
            placeholder="O que você achou do produto? Qualidade, embalagem, se chegou bem..."
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={4}
            className="resize-none"
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground mt-1 text-right">
            {comment.length}/500
          </p>
        </div>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          size="lg"
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            "Enviar Avaliação"
          )}
        </Button>
      </div>
    </div>
  );
};

export default ReviewForm;
