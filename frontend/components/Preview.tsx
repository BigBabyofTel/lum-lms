export default function Preview() {
	return (
		<div>
			<section className="w-full grid grid-cols-[repeat(3,minmax(0,400px))] grid-rows-3 gap-4 mb-24 place-content-center">
				<div className="border border-border w-full h-[400px] rounded-xl p-2 col-span-2">
					<div className="bg-gray-200 w-full h-full rounded-lg">
					</div>
				</div>

				<div className="border border-border w-full h-[400px] rounded-xl p-2">
					<div className="bg-gray-200 w-full h-full rounded-lg">
					</div>
				</div>


				<div className="border border-border w-full h-[400px] rounded-xl p-2 ">
					<div className="bg-gray-200 w-full h-full rounded-lg">
					</div>
				</div>

				<div className="border border-border w-full h-[400px] rounded-xl p-2 col-span-2">
					<div className="bg-gray-200 w-full h-full rounded-lg">
					</div>
				</div>

				<div className="border border-border w-full h-[400px] rounded-xl p-2 col-span-3">
					<div className="bg-gray-200 w-full h-full rounded-lg">
					</div>
				</div>


			</section>
		</div>
	)
}

