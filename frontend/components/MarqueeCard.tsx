const topMarquee = [
	{
		review:
			"This LMS has completely streamlined our training process. *The interface is intuitive and easy to navigate,* even for team members who aren’t tech-savvy.",
		name: "Sarah M.",
		description: "Review from a corporate training coordinator",
	},
	{
		review:
			"I was impressed by how quickly we could upload courses and track progress. *The analytics dashboard is incredibly detailed,* giving us insights we never had before.",
		name: "Daniel K.",
		description: "Review from an HR manager",
	},
	{
		review:
			"As an instructor, this platform has been a game-changer. *Creating and updating modules is fast and straightforward,* saving me hours each week.",
		name: "Maya R.",
		description: "Review from an online course instructor",
	},
	{
		review:
			"Our onboarding has improved significantly since switching to this LMS. *Learners appreciate how organized and clean everything is,* and completion rates have gone up.",
		name: "Leo D.",
		description: "Review from a team lead",
	},
	{
		review:
			"I love how customizable the platform is. *The ability to tailor learning paths for different departments* has made training much more effective.",
		name: "Hannah S.",
		description: "Review from a learning and development specialist",
	},
	{
		review:
			"Support has been fantastic. *Whenever we had questions or needed adjustments, the team responded quickly* and guided us through everything.",
		name: "Marcus T.",
		description: "Review from a project manager",
	},
];

export default function MarqueeCard() {
	return (
		<div className="group relative my-10 flex max-h-screen flex-col gap-4 overflow-hidden p-2 [--gap:1rem] sm:flex-row group">
			{Array.from({ length: 2 }, (_, ix) => (
				<ul
					className="animate-marquee flex shrink-0 min-w-full flex-col gap-(--gap) overflow-hidden sm:flex-row animate-marquee-y sm:animate-marquee-x group-hover:[animation-play-state:paused]"
					key={ix}
				>
					{topMarquee.map(({ review, name, description }, idx) => {
						let rgxForSplit = /^(.+)\*(.*)\*(.*)$/gm;
						let allText = [...review.matchAll(rgxForSplit)];
						const textSplitted = allText[0];

						return (
							<li
								className="w-fit rounded-xl border p-2 border-border bg-gray-100"
								key={idx}
							>
								<div className="bg-background rounded-md h-full flex flex-col p-4 inset-ring inset-ring-white/10">
									<p className="text-foreground/90 max-w-96 pb-6 leading-relaxed font-normal select-none">
										{textSplitted[1]}
										<span className="text-accent-foreground font-medium">
											{textSplitted[2]}
										</span>
										{textSplitted[3]}
									</p>

									<div className="flex items-center gap-2 mt-auto">
										<div className="size-8 rounded-full bg-linear-30 from-sky-300 to-orange-400" />
										<div className="">
											<h3 className="text-foreground/90 font-medium"> {name} </h3>
											<p className="text-foreground/50 text-xs font-normal">
												{description}
											</p>
										</div>
									</div>
								</div>
							</li>
						);
					})}
				</ul>
			))}

			<div className="from-background pointer-events-none absolute inset-x-0 top-0 h-1/4 w-full bg-linear-to-b from-20% sm:inset-y-0 sm:left-0 sm:h-full sm:w-1/4 sm:bg-linear-to-r" />
			<div className="from-background pointer-events-none absolute inset-x-0 bottom-0 h-1/4 w-full bg-linear-to-t from-20% sm:inset-y-0 sm:right-0 sm:h-full sm:w-1/4 sm:bg-linear-to-l sm:left-auto" />
		</div>
	);
}

