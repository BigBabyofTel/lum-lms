import MarqueeCard from './MarqueeCard';
import SectionHeader from './ui/SectionHeader';

export default function Testimonial() {
  return (
    <section className="w-full mb-24">
      <SectionHeader
        intro="See what they think about us"
        title="Reviews"
        description="lorem"
      />
      <MarqueeCard />
    </section>
  );
}
