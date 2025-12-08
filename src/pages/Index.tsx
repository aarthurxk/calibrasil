import MainLayout from '@/components/layout/MainLayout';
import Hero from '@/components/home/Hero';
import FeaturedProducts from '@/components/home/FeaturedProducts';
import Categories from '@/components/home/Categories';
import WhyChooseUs from '@/components/home/WhyChooseUs';

const Index = () => {
  return (
    <MainLayout>
      <Hero />
      <FeaturedProducts />
      <Categories />
      <WhyChooseUs />
    </MainLayout>
  );
};

export default Index;
