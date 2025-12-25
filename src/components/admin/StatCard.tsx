import { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  format?: 'number' | 'currency' | 'percent';
  className?: string;
  onClick?: () => void;
  isActive?: boolean;
  colorClass?: string;
  delay?: number;
}

export const StatCard = ({
  title,
  value,
  icon: Icon,
  trend = 'neutral',
  trendValue,
  format = 'number',
  className,
  onClick,
  isActive,
  colorClass,
  delay = 0,
}: StatCardProps) => {
  const isNumeric = typeof value === 'number';

  const formatValue = (val: number) => {
    switch (format) {
      case 'currency':
        return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      case 'percent':
        return `${val.toFixed(1)}%`;
      default:
        return val.toString();
    }
  };

  return (
    <Card
      className={cn(
        "transition-all duration-300 animate-fade-in",
        "hover:shadow-lg hover:-translate-y-1",
        onClick && "cursor-pointer",
        isActive && "ring-2 ring-primary shadow-lg",
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className={cn(
          "text-sm font-medium",
          colorClass || "text-muted-foreground"
        )}>
          {title}
        </CardTitle>
        <div className={cn(
          "p-2 rounded-lg transition-all duration-300",
          "group-hover:scale-110",
          isActive ? "bg-primary/10" : "bg-muted/50"
        )}>
          <Icon className={cn(
            "h-5 w-5 transition-transform duration-300",
            colorClass || "text-primary",
            onClick && "group-hover:scale-110"
          )} />
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", colorClass)}>
          {isNumeric ? (
            <AnimatedNumber
              value={value}
              formatFn={formatValue}
            />
          ) : (
            value
          )}
        </div>
        {trendValue && (
          <div
            className={cn(
              "flex items-center text-sm mt-1 transition-colors",
              trend === 'up' && "text-green-600",
              trend === 'down' && "text-red-600",
              trend === 'neutral' && "text-muted-foreground"
            )}
          >
            {trendValue}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
