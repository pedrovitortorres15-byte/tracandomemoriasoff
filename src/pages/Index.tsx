import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { ProductGrid } from "@/components/ProductGrid";
import { Footer } from "@/components/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { useSearchParams } from "react-router-dom";

const Index = () => {
  const [searchParams] = useSearchParams();
  const hasFilter = !!(searchParams.get("cat") || searchParams.get("q"));

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {!hasFilter && <Hero />}
        <ProductGrid />
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default Index;
