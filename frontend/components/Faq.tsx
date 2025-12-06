"use client";
import { useState } from 'react';
import { ChevronDown } from './ui/icons';
import SectionHeader from './ui/SectionHeader';

const faqContent = [
	{
		question: "What is an LMS?",
		answer: "Lorem ipsum dolor sit amet consectetur adipisicing elit. Commodi harum iusto at dolorem quas quo consequuntur qui ut, dicta distinctio!",
	},
	{
		question: "How does it work?",
		answer: "Lorem ipsum dolor sit amet consectetur adipisicing elit. Commodi harum iusto at dolorem quas quo consequuntur qui ut, dicta distinctio!",
	},
	{
		question: "Can i integrate my social accounts?",
		answer: "Lorem ipsum dolor sit amet consectetur adipisicing elit. Commodi harum iusto at dolorem quas quo consequuntur qui ut, dicta distinctio!",
	}, {
		question: "Is it free?",
		answer: "Lorem ipsum dolor sit amet consectetur adipisicing elit. Commodi harum iusto at dolorem quas quo consequuntur qui ut, dicta distinctio!",
	}, {
		question: "Is it legal?",
		answer: "Lorem ipsum dolor sit amet consectetur adipisicing elit. Commodi harum iusto at dolorem quas quo consequuntur qui ut, dicta distinctio!",
	},
]



export default function Faq() {
	const [open, setOpen] = useState<number>(-1);
	return (
		<section className="w-full mb-24">
			<SectionHeader
				intro="Do you still have questions?"
				title="Frequently Asked Question"
				align="left"
			/>

			<div className="flex flex-col gap-y-2">
				{faqContent.map(({ question, answer }, index) =>
					<div
						className="max-w-3xl"
						key={index}
					>
						<header
							className={`flex justify-between border border-border rounded-xl p-4 items-center cursor-pointer mb-2 ${open === index ? "ring-2 ring-border" : ""}`}
							onClick={() => setOpen(index)}
						>
							<h3 className={`text-sm font-medium ${open === index ? "text-blue-600" : "text-foreground"}`}> {question} </h3>
							<ChevronDown className={`size-4 ${open === index ? "rotate-180" : "rotate-0"} transition-[rotate] duration-300 ease-out`} />
						</header>

						{open === index ? (
							<div className="flex justify-between border border-border rounded-xl p-4 items-center cursor-pointer starting:opacity-0 starting:h-0 transition-opacity duration-900 ease-out">
								<p className="text-sm leading-relaxed">{answer}</p>
							</div>
						) : null}
					</div>
				)}
			</div>
		</section>
	)
}

