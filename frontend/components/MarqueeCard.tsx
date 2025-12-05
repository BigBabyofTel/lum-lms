const topMarquee = [
	{
		review:
			"Lorem ipsum dolor sit amet, consectetur adipisicing elit. *Rem repellat quia ut recusandae voluptas quaerat minus* ex similique architecto? Iste? ",
		name: "000000",
		description: "Name of a song by the artist Clairo",
	},
	{
		review:
			"Lorem ipsum dolor sit amet, consectetur adipisicing elit. *Hello how are you?* ex similique architecto? Iste? ",
		name: "111111",
		description: "Name of a song by the artist Clairo",
	},
	{
		review:
			"Lorem ipsum dolor sit amet, consectetur adipisicing elit. *Hello how are you?* ex similique architecto? Iste? ",
		name: "222222",
		description: "Name of a song by the artist Clairo",
	},
	{
		review:
			"Lorem ipsum dolor sit amet, consectetur adipisicing elit. *Hello how are you?* ex similique architecto? Iste? ",
		name: "333333",
		description: "Name of a song by the artist Clairo",
	},
	{
		review:
			"Lorem ipsum dolor sit amet, consectetur adipisicing elit. *Hello how are you?* ex similique architecto? Iste? ",
		name: "444444",
		description: "Name of a song by the artist Clairo",
	},
	{
		review:
			"Lorem ipsum dolor sit amet, consectetur adipisicing elit. *Hello how are you?* ex similique architecto? Iste? ",
		name: "555555",
		description: "Name of a song by the artist Clairo",
	},
];

export default function MarqueeCard() {
	return (
		<div className="group relative my-10 flex max-h-screen flex-col gap-4 overflow-hidden p-2 [--gap:1rem] sm:flex-row">
			{Array.from({ length: 2 }, (_, ix) => (
				<ul
					className="animate-marquee flex shrink-0 min-w-full flex-col gap-(--gap) overflow-hidden sm:flex-row animate-marquee-y sm:animate-marquee-x"
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
								<div className="bg-slate-300 rounded-md h-full flex flex-col p-4 inset-ring inset-ring-white/10">
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

