import { Link } from 'react-router-dom';
import { Cpu, Backpack, ArrowRight } from 'lucide-react';

const categories = [
  {
    name: 'Tech Gear',
    description: 'Smart devices designed for beach life',
    icon: Cpu,
    path: '/shop?category=tech',
    gradient: 'bg-gradient-ocean',
  },
  {
    name: 'Accessories',
    description: 'Essential beach-tech companions',
    icon: Backpack,
    path: '/shop?category=accessories',
    gradient: 'bg-gradient-sunset',
  },
];

const Categories = () => {
  return (
    <section className="py-20 bg-muted">
      <div className="container">
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-accent uppercase tracking-widest mb-2">
            Browse By Category
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Shop Our Collections
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {categories.map((category) => (
            <Link
              key={category.name}
              to={category.path}
              className="group relative overflow-hidden rounded-2xl p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-glow"
            >
              <div className={`absolute inset-0 ${category.gradient} opacity-90`} />
              <div className="relative z-10 flex items-center justify-between">
                <div className="space-y-3">
                  <div className="w-14 h-14 rounded-xl bg-background/20 flex items-center justify-center backdrop-blur-sm">
                    <category.icon className="h-7 w-7 text-primary-foreground" />
                  </div>
                  <h3 className="text-2xl font-bold text-primary-foreground">
                    {category.name}
                  </h3>
                  <p className="text-primary-foreground/80">
                    {category.description}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-background/20 flex items-center justify-center transition-transform group-hover:translate-x-2">
                  <ArrowRight className="h-6 w-6 text-primary-foreground" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Categories;
