import Button from './ui/Button';
import SectionHeader from './ui/SectionHeader';

export default function Cta() {
	return (
		<section className="text-center mb-24">
				<SectionHeader
					intro="What are you waiting for"
					title="Get started today"
					align="center"
				/>
				<Button> Get Started </Button>
		</section>
	);
}
