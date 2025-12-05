import Button from './ui/Button';
import { Check } from './ui/icons';
import SectionHeader from './ui/SectionHeader';

interface PriceCards {
	label: string;
	price: string;
	description: string;
	buttonLabel: string;
	features: string[];
}[]

const priceCards: PriceCards[] = [
	{
		label: "Free",
		price: "$0",
		description: "Perferct for solo freelance, students",
		buttonLabel: "Get started",
		features: ["Lorem ipsum dolor", "Lorem ipsum dolor", "Lorem ipsum dolor", "Lorem ipsum dolor"],
	},
	{
		label: "Regular",
		price: "$12",
		description: "Ideal for a group",
		buttonLabel: "Upgrade now",
		features: ["Lorem ipsum dolor", "Lorem ipsum dolor", "Lorem ipsum dolor", "Lorem ipsum dolor", "Lorem ipsum dolor", "Lorem ipsum dolor", "Lorem ipsum dolor", "Lorem ipsum dolor"],
	},
	{
		label: "Enterprise",
		price: "$24",
		description: "Ideal for a teams and enterprise",
		buttonLabel: "lorem something",
		features: ["Lorem ipsum dolor", "Lorem ipsum dolor", "Lorem ipsum dolor", "Lorem ipsum dolor", "Lorem ipsum dolor", "Lorem ipsum dolor", "Lorem ipsum dolor", "Lorem ipsum dolor"],
	}
]

function PriceCard() {
	return (
		<>
			{priceCards.map(({ label, price, description, buttonLabel, features }, idx) =>
				<div
					className={`rounded-xl ${label === "Regular" ? "bg-background shadow-xl inset-ring inset-ring-secondary" : "bg-secondary"} p-4`}
					key={idx}
				>
					<div className="">
						<h3 className="font-medium text-sm/5 pb-2"> {label} </h3>
						<h2 className="text-5xl font-semibold pb-6"> {price}  <span className="text-base font-normal">/month </span> </h2>
						<p className="text-base/6 pb-10">{description}</p>
						<Button className="mb-4">{buttonLabel}</Button>
					</div>

					<ul className="border-t pt-4 flex flex-col gap-2">
						{features.map((feature, idx) =>
							<li
								className="flex gap-2"
								key={idx}
							>
								<div className="rounded-full grid place-content-center p-1 border border-border">
									<Check className="size-3" />
								</div>
								{feature}
							</li>

						)}
					</ul>

				</div>

			)
			}
		</>
	)
}

export default function Pricing() {
	return (
		<section className="mb-24">
			<SectionHeader
				intro="Pricing"
				title="Pricing thinked for you"
			/>
			<div className="grid grid-cols-[400px] min-[650px]:grid-cols-2 min-[900px]:grid-cols-3 gap-2">
				<PriceCard />
			</div>
		</section>
	)
}



