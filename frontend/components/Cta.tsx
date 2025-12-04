import Button from './ui/Button';
import SectionHeader from './ui/SectionHeader';

export default function Cta() {
  return (
    <section className="w-full">
      <SectionHeader
        intro="What are you waiting for"
        title="Get started today"
      />
      <Button> Get Started </Button>
    </section>
  );
}
