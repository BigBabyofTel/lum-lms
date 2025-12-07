import Button from './ui/Button';
import SectionHeader from './ui/SectionHeader';

export default function Cta() {
	return (
		<section className="mb-24 p-2  bg-accent rounded-3xl">
			<div className="bg-background w-full p-4 rounded-2xl">
				<SectionHeader
					intro="What are you waiting for"
					title="Start your experience with us!"
					align="left"
				/>
				<Button variant="accent"> Get Started </Button>
			</div>
		</section>
	);
}
