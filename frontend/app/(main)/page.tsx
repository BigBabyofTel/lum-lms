import Cta from '@/components/Cta';
import Faq from '@/components/Faq';
import Hero from '@/components/Hero';
import Preview from '@/components/Preview';
import Pricing from '@/components/Pricing';
import Testimonial from '@/components/Testimonial';

export default function Home() {
	return (
		<>
			<Hero />
			<Preview />
			<Pricing />
			<Testimonial />
			<Faq />
			<Cta />
		</>
	);
}
