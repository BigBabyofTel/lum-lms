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
	return (
		<section className="w-full mb-24">
			<SectionHeader
				intro="Do you still have questions?"
				title="Frequently Asked Question"
				align="left"
			/>

			{faqContent.map(({ question, answer }, idx) =>
				<div className="grid grid-cols-1 sm:grid-cols-2 py-8 px-2 border-border border-b" key={idx}>
					<h3 className="text-base font-semibold text-foreground"> {question} </h3>
					<p className="text-base leading-relaxed text-secondary-foreground pt-4 sm:pt-0"> {answer} </p>
				</div>
			)}
			<div className="flex flex-col gap-y-2">
			</div>
		</section>
	)
}

