import Link from "next/link"
import { Logo, Instagram, Twitter, BlueSky } from "./ui/icons"

const linkContents = [
	{
		title: "Navigation",
		links: ["About", "Contact", "Blog", "Story"]
	},
	{
		title: "Teachers",
		links: ["About", "Contact", "Blog", "Story"]
	},
	{
		title: "Students",
		links: ["About", "Contact", "Blog", "Story"]
	},
]

export default function Footer() {
	return (
		<footer className="px-4 sm:px-4 md:px-10 pb-10 lg:flex-row flex flex-col">

			<div className="flex flex-col w-full gap-y-5 mb-5">

				<Link href="/" className="flex items-center gap-2">
					<Logo className="size-8" />
					<h3 className="text-2xl font-semibold tracking-tight"> lualms </h3>
				</Link>

				<p className="text-sm/5">
					Copyright (c) 2025 LmsLua. All Rights Reserved.
				</p>

				<div className="flex gap-2 items-center">
					<Link href="/">
						<Instagram className="size-6" />
					</Link>
					<Link href="/">
						<Twitter className="size-6" />
					</Link>
					<Link href="/">
						<BlueSky className="size-6" />
					</Link>
				</div>

			</div>


			<div className="flex gap-8 min-[350px]:gap-12 lg:gap-24">
				{linkContents.map(({ title, links }, idx) =>
					<div key={idx}>
						<h3 className="mb-2 text-sm font-semibold"> {title} </h3>
						<ul className="flex flex-col gap-y-2">
							{links.map((link, idx) =>
								<li key={idx}> <Link className="text-sm font-regular text-muted-foreground hover:text-foreground" href={"/" + link.toLowerCase()}> {link} </Link> </li>
							)}
						</ul>
					</div>
				)}
			</div>

		</footer>
	)
}

